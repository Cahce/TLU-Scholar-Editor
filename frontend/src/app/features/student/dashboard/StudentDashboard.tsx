import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Plus,
  ExternalLink,
  Download,
  Settings,
  LayoutGrid,
  List,
  PenTool,
  ChevronDown,
  X,
  FileText,
  FileBadge,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Loader2,
  FileUp,
  Trash2,
} from "lucide-react";
import { ProjectImportModal } from "./ProjectImportModal";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../../../api/projects";
import { compileProjectPdf } from "../../../api/compile";
import { ApiError } from "../../../api/client";
import { usePublicTemplates } from "../../../hooks/usePublicTemplates";
import { downloadBlob, sanitizeFilename } from "../../../utils/download";
import type { Project, TemplateCategory } from "../../../types/api";
import type { PublicTemplate } from "../../../types/templates";

const PROJECT_CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: "thesis", label: "Luận văn / Khóa luận" },
  { value: "report", label: "Báo cáo" },
  { value: "proposal", label: "Đề xuất" },
  { value: "paper", label: "Bài báo" },
  { value: "presentation", label: "Trình chiếu" },
  { value: "other", label: "Khác" },
];

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  thesis: "Luận văn / Khóa luận",
  report: "Báo cáo",
  proposal: "Đề xuất",
  paper: "Bài báo",
  presentation: "Trình chiếu",
  other: "Khác",
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function StudentDashboard() {
  const navigate = useNavigate();
  // Tabs "Tất cả project" và "Project được chia sẻ" tạm ẩn cho đến khi backend
  // có chia sẻ; hiện chỉ còn "Project của tôi".

  const [sortOption, setSortOption] = useState("Cập nhật gần nhất");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listProjects();
        setProjects(response.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải danh sách project");
        toast.error("Không thể tải danh sách project", {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");
  
  // Blank form state
  const [blankProjectName, setBlankProjectName] = useState("");
  const [blankProjectCategory, setBlankProjectCategory] = useState("");
  
  // Template form state
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<"all" | TemplateCategory>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [templateProjectName, setTemplateProjectName] = useState("");
  const [templateProjectCategory, setTemplateProjectCategory] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  // Public templates from backend
  const publicTemplates = usePublicTemplates();
  const templates = publicTemplates.data?.templates ?? [];

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      if (sortOption === "Cập nhật gần nhất") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortOption === "Ngày tạo mới nhất") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === "Tên A-Z") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [projects, searchQuery, sortOption]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return templates.filter((t) => {
      const haystack = `${t.name} ${t.description ?? ""}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchCat = templateCategoryFilter === "all" || t.category === templateCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [templates, templateSearch, templateCategoryFilter]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const handleSelectTemplate = (template: PublicTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateProjectCategory(template.category);
    if (!templateProjectName) {
      setTemplateProjectName(`Project từ ${template.name}`);
    }
  };

  const handleCreateBlank = async () => {
    if (!blankProjectName || !blankProjectCategory) {
      toast.error("Vui lòng điền đầy đủ thông tin", { icon: <AlertCircle className="w-5 h-5 text-red-500" /> });
      return;
    }
    
    try {
      const newProject = await createProject({
        title: blankProjectName,
        category: blankProjectCategory as TemplateCategory,
      });
      
      setIsCreateModalOpen(false);
      toast.success("Tạo project thành công", { 
        description: "Project đã được khởi tạo với tệp main.typ.",
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
      });
      
      // Reload projects list
      const response = await listProjects();
      setProjects(response.projects);
      
      // Navigate to workspace
      setTimeout(() => {
        navigate(`/workspace/${newProject.id}`);
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo project", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />
      });
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !templateProjectName.trim() || !templateProjectCategory) {
      toast.error("Vui lòng điền đầy đủ thông tin", { icon: <AlertCircle className="w-5 h-5 text-red-500" /> });
      return;
    }

    if (!selectedTemplate.latestVersion) {
      toast.error("Mẫu này chưa có phiên bản khả dụng", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }

    setCreatingFromTemplate(true);
    try {
      const newProject = await createProject({
        title: templateProjectName.trim(),
        category: templateProjectCategory as TemplateCategory,
        templateVersionId: selectedTemplate.latestVersion.id,
      });

      setIsCreateModalOpen(false);
      toast.success("Tạo project thành công", {
        description: "Project đã được khởi tạo từ mẫu đã chọn.",
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });

      navigate(`/workspace/${newProject.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_TEMPLATE_VERSION") {
        toast.error("Mẫu không còn khả dụng, vui lòng chọn mẫu khác", {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        });
        await publicTemplates.refetch();
        setSelectedTemplateId(null);
      } else {
        toast.error(err instanceof Error ? err.message : "Không thể tạo project", {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        });
      }
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  // Import-from-zip modal lives separately from the create modal.
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Configure project dialog (rename + delete) — mirrors typst.app's
  // "Configure project" sheet.
  const [configProject, setConfigProject] = useState<Project | null>(null);
  const [configName, setConfigName] = useState("");
  const [configCategory, setConfigCategory] = useState<TemplateCategory | "">("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configDeleting, setConfigDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Per-row inline action state — used by Download/Duplicate to disable the
  // icon while the action is running so users don't double-click and get two
  // exports/imports.
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const openConfigDialog = (project: Project) => {
    setConfigProject(project);
    setConfigName(project.title);
    setConfigCategory(project.category);
    setConfirmingDelete(false);
  };

  const closeConfigDialog = () => {
    if (configSaving || configDeleting) return;
    setConfigProject(null);
    setConfirmingDelete(false);
  };

  const handleSaveConfig = async () => {
    if (!configProject) return;
    const trimmed = configName.trim();
    if (!trimmed) {
      toast.error("Tên project không được để trống", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }
    if (!configCategory) {
      toast.error("Vui lòng chọn loại project", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }

    setConfigSaving(true);
    try {
      const updated = await updateProject(configProject.id, {
        title: trimmed,
        category: configCategory,
      });
      setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      toast.success("Đã cập nhật project", {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });
      setConfigProject(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật project", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!configProject) return;
    setConfigDeleting(true);
    try {
      await deleteProject(configProject.id);
      setProjects(prev => prev.filter(p => p.id !== configProject.id));
      toast.success("Đã xoá project", {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });
      setConfigProject(null);
      setConfirmingDelete(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xoá project", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setConfigDeleting(false);
    }
  };

  const handleDownloadProject = async (project: Project) => {
    setBusyProjectId(project.id);
    // Compiling can take several seconds, so keep the user informed.
    const toastId = toast.loading("Đang biên dịch PDF, vui lòng đợi...");
    try {
      const blob = await compileProjectPdf(project.id);
      downloadBlob(blob, `${sanitizeFilename(project.title)}.pdf`);
      toast.success("Đã tải xuống PDF", {
        id: toastId,
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải PDF", {
        id: toastId,
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setBusyProjectId(null);
    }
  };

  const openModal = (mode: "blank" | "template") => {
    setCreateMode(mode);
    // Reset states
    setBlankProjectName("");
    setBlankProjectCategory("");
    setSelectedTemplateId(null);
    setTemplateProjectName("");
    setTemplateProjectCategory("");
    setTemplateSearch("");
    setTemplateCategoryFilter("all");
    setIsCreateModalOpen(true);
    if (mode === "template") {
      void publicTemplates.refetch();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 pb-4 relative">
      {/* Header */}
      <div className="mb-8 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Danh sách project</h1>
        <p className="text-slate-500 mt-1.5 text-[15px]">Quản lý và tổ chức không gian làm việc học thuật của bạn</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mb-12">
        <button
          onClick={() => openModal("blank")}
          className="flex items-center gap-4 px-5 py-4 rounded-xl border border-slate-200 bg-white hover:border-[#007bff] hover:shadow-sm transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#007bff]/20 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-[#007bff] transition-colors">
             <Plus className="w-4 h-4" />
          </div>
          <div>
             <span className="block font-semibold text-slate-900 text-[15px] group-hover:text-[#007bff] transition-colors">Tạo project trống</span>
             <span className="block text-[13px] text-slate-500 mt-0.5">Bắt đầu từ không gian trắng</span>
          </div>
        </button>
        
        <div className="flex border border-slate-200 rounded-xl bg-white hover:border-[#007bff] hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#007bff]/20 group cursor-pointer" onClick={() => openModal("template")}>
          <button className="flex-1 flex items-center gap-4 px-5 py-4 text-left rounded-l-xl focus:outline-none">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-[#007bff] transition-colors">
               <PenTool className="w-4 h-4" />
            </div>
            <div>
               <span className="block font-semibold text-slate-900 text-[15px] group-hover:text-[#007bff] transition-colors">Tạo từ mẫu</span>
               <span className="block text-[13px] text-slate-500 mt-0.5">Sử dụng mẫu chuẩn của trường</span>
            </div>
          </button>
          <div className="w-px bg-slate-100 group-hover:bg-[#007bff]/20 transition-colors" />
          <button className="px-4 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-r-xl focus:outline-none transition-colors">
             <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Import from .zip */}
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-4 px-5 py-4 rounded-xl border border-slate-200 bg-white hover:border-[#007bff] hover:shadow-sm transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#007bff]/20 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-[#007bff] transition-colors">
            <FileUp className="w-4 h-4" />
          </div>
          <div>
            <span className="block font-semibold text-slate-900 text-[15px] group-hover:text-[#007bff] transition-colors">Nhập từ .zip</span>
            <span className="block text-[13px] text-slate-500 mt-0.5">Tải lên bản sao lưu</span>
          </div>
        </button>
      </div>

      {/* Tabs: chỉ hiển thị "Project của tôi" */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          className="pb-3 text-[15px] font-medium text-[#007bff] relative focus:outline-none"
        >
          Project của tôi
          <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#007bff]" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            type="text" 
            placeholder="Tìm kiếm project" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-[#007bff]/20 focus:border-[#007bff] h-9 text-[13px] rounded-lg transition-all"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-[13px] text-slate-500 font-medium whitespace-nowrap">Sắp xếp theo</label>
            <div className="relative">
              <select 
                id="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none h-9 text-[13px] border border-slate-200 rounded-lg pl-3 pr-8 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] min-w-[160px] shadow-sm transition-shadow cursor-pointer"
              >
                <option value="Cập nhật gần nhất">Cập nhật gần nhất</option>
                <option value="Ngày tạo mới nhất">Ngày tạo mới nhất</option>
                <option value="Tên A-Z">Tên A-Z</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white h-9 shadow-sm">
            <button className="w-9 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 focus:outline-none transition-colors"><LayoutGrid className="w-4 h-4" /></button>
            <div className="w-px h-full bg-slate-200" />
            <button className="w-9 h-full flex items-center justify-center text-[#007bff] bg-blue-50/50 focus:outline-none transition-colors"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-slate-600">
                <th className="py-4 pl-6 pr-4 w-[40%]">Tên project</th>
                <th className="py-4 px-4 w-[15%]">Loại project</th>
                <th className="py-4 px-4 w-[15%]">Ngày tạo</th>
                <th className="py-4 px-4 w-[15%]">Cập nhật gần nhất</th>
                <th className="py-4 pr-6 pl-4 text-right w-[15%]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-8 h-8 text-[#007bff] animate-spin mb-4" />
                      <p className="text-[15px] font-medium text-slate-900">Đang tải danh sách project...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedProjects.length > 0 ? (
                filteredAndSortedProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="group transition-colors bg-white hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td className="py-4 pl-6 pr-4 font-medium text-slate-900 truncate group-hover:text-[#007bff] transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <span className="truncate">{project.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      {PROJECT_CATEGORIES.find(c => c.value === project.category)?.label || "Khác"}
                    </td>
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(project.createdAt)}
                    </td>
                    
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(project.updatedAt)}
                    </td>
                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end">
                        <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 shadow-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${project.id}`); }}
                            className="p-2 text-slate-500 hover:bg-slate-50 hover:text-[#007bff] border-r border-slate-200 transition-colors focus:outline-none"
                            title="Mở"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleDownloadProject(project); }}
                            disabled={busyProjectId === project.id}
                            className="p-2 text-slate-500 hover:bg-slate-50 hover:text-[#007bff] border-r border-slate-200 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Tải xuống PDF"
                          >
                            {busyProjectId === project.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openConfigDialog(project); }}
                            className="p-2 text-slate-500 hover:bg-slate-50 hover:text-[#007bff] transition-colors focus:outline-none"
                            title="Cấu hình project"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FolderKanban className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-[15px] font-medium text-slate-900 mb-1">Bạn chưa có project nào</p>
                      <p className="text-[14px]">Hãy tạo project mới để bắt đầu soạn thảo</p>
                      <Button onClick={() => openModal("blank")} className="mt-6 bg-[#007bff] hover:bg-[#0069d9] text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo project mới
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={`bg-white rounded-2xl shadow-xl w-full border border-slate-200 overflow-hidden flex flex-col transition-all ${createMode === 'template' ? 'max-w-[1000px] h-[85vh]' : 'max-w-[500px]'}`} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0 bg-white relative z-10">
              <div>
                <h2 className="text-[20px] font-bold text-slate-900 leading-none">Tạo project mới</h2>
                <p className="text-[14px] text-slate-500 mt-1.5">Khởi tạo không gian làm việc cho tài liệu học thuật</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full p-2 focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
              <button 
                onClick={() => setCreateMode("blank")}
                className={`py-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${createMode === 'blank' ? 'border-[#007bff] text-[#007bff]' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                Tạo trống
              </button>
              <button 
                onClick={() => setCreateMode("template")}
                className={`py-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${createMode === 'template' ? 'border-[#007bff] text-[#007bff]' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                Tạo từ mẫu
              </button>
            </div>

            {/* Modal Body */}
            {createMode === 'blank' ? (
              <>
                <div className="p-6 space-y-5">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-[14px]">
                    <FileText className="w-5 h-5 text-[#007bff] shrink-0" />
                    <div>
                      <p className="font-medium text-[#007bff] mb-0.5">Project sẽ được khởi tạo với tệp mặc định main.typ.</p>
                      <p className="text-blue-700/80">Bạn có thể thêm tệp .bib, hình ảnh, dữ liệu và các tệp Typst khác sau khi tạo project.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">Tên project <span className="text-red-500">*</span></label>
                    <Input 
                      placeholder="Nhập tên project" 
                      value={blankProjectName}
                      onChange={e => setBlankProjectName(e.target.value)}
                      className="focus:ring-[#007bff] bg-white border-slate-200" 
                      autoFocus 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">Loại project <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        value={blankProjectCategory}
                        onChange={e => setBlankProjectCategory(e.target.value)}
                        className="w-full appearance-none h-10 text-[14px] border border-slate-200 rounded-md pl-3 pr-8 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] shadow-sm transition-shadow cursor-pointer"
                      >
                        <option value="" disabled hidden>Chọn loại project</option>
                        {PROJECT_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-5 font-medium">
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleCreateBlank} 
                    disabled={!blankProjectName || !blankProjectCategory}
                    className="bg-[#007bff] text-white hover:bg-[#0069d9] h-10 px-5 font-medium shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Tạo project
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                {/* Left: Template Gallery */}
                <div className="w-[60%] flex flex-col border-r border-slate-200 bg-[#f8fafc]">
                  {/* Filters */}
                  <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex flex-col gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm mẫu" 
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-[14px] bg-slate-50 border border-slate-200 rounded-md focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] focus:outline-none transition-all focus:bg-white"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={templateCategoryFilter}
                        onChange={e => setTemplateCategoryFilter(e.target.value as "all" | TemplateCategory)}
                        className="w-full appearance-none h-9 text-[13px] border border-slate-200 rounded-md pl-3 pr-8 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] shadow-sm cursor-pointer"
                      >
                        <option value="all">Tất cả loại mẫu</option>
                        {PROJECT_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {publicTemplates.loading ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 mb-3 text-[#007bff] animate-spin" />
                        <p className="text-[14px] font-medium text-slate-700">Đang tải danh sách mẫu...</p>
                      </div>
                    ) : publicTemplates.error ? (
                      <div className="h-full flex flex-col items-center justify-center text-rose-600 gap-2">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-[14px] font-medium">{publicTemplates.error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void publicTemplates.refetch()}
                          className="mt-2"
                        >
                          Thử lại
                        </Button>
                      </div>
                    ) : filteredTemplates.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {filteredTemplates.map(template => (
                          <div
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={`border rounded-xl overflow-hidden bg-white cursor-pointer transition-all group ${selectedTemplateId === template.id ? 'border-[#007bff] ring-1 ring-[#007bff] shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                          >
                            <div className="aspect-[4/3] bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 relative group-hover:bg-blue-50/30 transition-colors">
                              <LayoutTemplate className={`w-12 h-12 ${selectedTemplateId === template.id ? 'text-[#007bff]' : 'text-slate-300 group-hover:text-blue-300'}`} />
                              {template.isOfficial && (
                                <div className="absolute top-2 right-2 bg-blue-100 text-[#007bff] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Chính thức
                                </div>
                              )}
                              {!template.latestVersion && (
                                <div className="absolute bottom-2 right-2 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                  Chưa có phiên bản
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="font-semibold text-slate-900 text-[14px] line-clamp-1 group-hover:text-[#007bff] transition-colors">{template.name}</h3>
                              <p className="text-[12px] text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.5em]">{template.description || "Chưa có mô tả"}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-medium">{CATEGORY_LABEL[template.category]}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Search className="w-8 h-8 mb-3 text-slate-300" />
                        <p className="text-[14px] font-medium text-slate-700">Không tìm thấy mẫu nào</p>
                        <p className="text-[13px] mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Template Details & Form */}
                <div className="w-[40%] flex flex-col bg-white">
                  {!selectedTemplate ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                        <FileBadge className="w-8 h-8 text-[#007bff]" />
                      </div>
                      <h3 className="text-[18px] font-bold text-slate-900 mb-2">Chọn một mẫu để bắt đầu</h3>
                      <p className="text-[14px] text-slate-500 leading-relaxed max-w-[280px]">Chọn mẫu phù hợp để khởi tạo project. Bạn có thể chỉnh sửa lại toàn bộ nội dung sau khi tạo.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto p-6">
                        {/* Template Info */}
                        <div className="mb-6">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-[20px] font-bold text-slate-900 leading-tight">{selectedTemplate.name}</h3>
                            {selectedTemplate.isOfficial && (
                              <span className="bg-blue-100 text-[#007bff] text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                Mẫu chính thức
                              </span>
                            )}
                          </div>
                          <p className="text-[14px] text-slate-600 leading-relaxed mb-4">{selectedTemplate.description || "Chưa có mô tả"}</p>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Loại mẫu</div>
                              <div className="text-[13px] font-medium text-slate-900">{CATEGORY_LABEL[selectedTemplate.category]}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Phiên bản mới nhất</div>
                              <div className="text-[13px] font-medium text-slate-900">{selectedTemplate.latestVersion?.versionNumber || "—"}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cập nhật gần nhất</div>
                              <div className="text-[13px] font-medium text-slate-900">{formatDate(selectedTemplate.updatedAt)}</div>
                            </div>
                          </div>

                          {!selectedTemplate.latestVersion && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-[13px]">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>Mẫu này chưa có phiên bản khả dụng, vui lòng chọn mẫu khác.</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full h-px bg-slate-200 mb-6" />

                        {/* Project Form */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">Tên project <span className="text-red-500">*</span></label>
                            <Input 
                              placeholder="Nhập tên project" 
                              value={templateProjectName}
                              onChange={e => setTemplateProjectName(e.target.value)}
                              className="focus:ring-[#007bff] bg-white border-slate-200" 
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">Loại project <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <select 
                                value={templateProjectCategory}
                                onChange={e => setTemplateProjectCategory(e.target.value)}
                                className="w-full appearance-none h-10 text-[14px] border border-slate-200 rounded-md pl-3 pr-8 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] shadow-sm transition-shadow cursor-pointer"
                              >
                                <option value="" disabled hidden>Chọn loại project</option>
                                {PROJECT_CATEGORIES.map(cat => (
                                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">Phiên bản mẫu</label>
                            <Input
                              value={selectedTemplate.latestVersion?.versionNumber || "Chưa có phiên bản"}
                              disabled
                              className="bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                            />
                          </div>

                          <p className="text-[13px] text-slate-500 mt-2">Project sẽ lưu liên kết tới mẫu và phiên bản mẫu đã chọn.</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={creatingFromTemplate} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-5 font-medium">
                          Hủy
                        </Button>
                        <Button
                          onClick={() => void handleCreateFromTemplate()}
                          disabled={!templateProjectName.trim() || !templateProjectCategory || !selectedTemplate.latestVersion || creatingFromTemplate}
                          className="bg-[#007bff] text-white hover:bg-[#0069d9] h-10 px-5 font-medium shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {creatingFromTemplate ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Đang tạo...
                            </>
                          ) : (
                            "Tạo project"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ProjectImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImported={(project) => {
          setImportModalOpen(false);
          toast.success("Đã nhập dự án thành công");
          navigate(`/workspace/${project.id}`);
        }}
      />

      {/* Configure project dialog — mirrors typst.app's "Configure <name>" sheet */}
      {configProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeConfigDialog}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[460px] border border-slate-200 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="text-[18px] font-bold text-slate-900 leading-none truncate pr-4">
                Cấu hình &quot;{configProject.title}&quot;
              </h2>
              <button
                onClick={closeConfigDialog}
                disabled={configSaving || configDeleting}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full p-2 focus:outline-none disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">
                  Tên project <span className="text-red-500">*</span>
                </label>
                <Input
                  value={configName}
                  onChange={e => setConfigName(e.target.value)}
                  autoFocus
                  disabled={configSaving || configDeleting}
                  placeholder="Nhập tên project"
                  className="focus:ring-[#007bff] bg-white border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[14px] font-semibold text-slate-900 mb-1.5">
                  Loại project <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={configCategory}
                    onChange={e => setConfigCategory(e.target.value as TemplateCategory)}
                    disabled={configSaving || configDeleting}
                    className="w-full appearance-none h-10 text-[14px] border border-slate-200 rounded-md pl-3 pr-8 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] shadow-sm cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled hidden>Chọn loại project</option>
                    {PROJECT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {confirmingDelete && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[13px]">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Xác nhận xoá project?</p>
                    <p className="mt-0.5">Toàn bộ tệp trong project sẽ bị xoá vĩnh viễn và không thể khôi phục.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              {confirmingDelete ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={configDeleting}
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4 font-medium"
                  >
                    Huỷ
                  </Button>
                  <Button
                    onClick={() => void handleDeleteConfig()}
                    disabled={configDeleting}
                    className="bg-red-600 text-white hover:bg-red-700 h-10 px-4 font-medium shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {configDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang xoá...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xoá project
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={configSaving}
                    className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-10 px-4 font-medium"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xoá project
                  </Button>
                  <Button
                    onClick={() => void handleSaveConfig()}
                    disabled={configSaving || !configName.trim() || !configCategory}
                    className="bg-[#007bff] text-white hover:bg-[#0069d9] h-10 px-5 font-medium shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {configSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}