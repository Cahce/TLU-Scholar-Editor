export const NODE = {
  Markup: "Markup",

  Heading: "Heading",
  HeadingMarker: "HeadingMarker",

  Strong: "Strong",
  Emph: "Emph",

  Raw: "Raw",
  RawDelim: "RawDelim",
  RawLang: "RawLang",
  RawTrimmed: "RawTrimmed",

  ListItem: "ListItem",
  ListMarker: "ListMarker",
  EnumItem: "EnumItem",
  EnumMarker: "EnumMarker",
  TermItem: "TermItem",
  TermMarker: "TermMarker",

  Equation: "Equation",
  Math: "Math",
  MathText: "MathText",
  MathIdent: "MathIdent",
  MathAttach: "MathAttach",
  MathFrac: "MathFrac",
  MathRoot: "MathRoot",

  Ref: "Ref",
  RefMarker: "RefMarker",
  Label: "Label",

  Link: "Link",

  FuncCall: "FuncCall",
  Hash: "Hash",
  Ident: "Ident",

  Linebreak: "Linebreak",
  Parbreak: "Parbreak",
  Space: "Space",
} as const;

export type TypstNodeName = (typeof NODE)[keyof typeof NODE];
