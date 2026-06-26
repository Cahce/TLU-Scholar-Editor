import { Link, useParams } from "react-router";
import { FileQuestion } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getTopic } from "./helpContent";

export function HelpTopicPage() {
  const { topic: slug } = useParams<{ topic: string }>();
  const topic = getTopic(slug);

  if (!topic) {
    return (
      <div className="w-full max-w-2xl mx-auto pb-12">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy chủ đề</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Chủ đề trợ giúp bạn tìm không tồn tại hoặc đã được di chuyển.
          </p>
          <Button asChild className="mt-5 bg-[#007bff] hover:bg-[#0056b3] text-white">
            <Link to="/huong-dan">Về Trung tâm trợ giúp</Link>
          </Button>
        </div>
      </div>
    );
  }

  const TopicComponent = topic.Component;
  return <TopicComponent />;
}
