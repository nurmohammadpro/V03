import { useWorkspaceStore } from "../../stores/workspaceStore";
import CodeEditor from "./CodeEditor";

export default function WorkspaceLayout() {
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tabs bar */}
      <div className="flex items-center px-3 py-1.5 bg-[#0B0F14] border-b border-white/5 min-h-[32px]">
        {activeFileContent && activeFilePath && (
          <div className="flex items-center gap-2 text-xs text-[#9BA7B4] bg-[#111827] px-2.5 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span className="text-[#E6EDF3] font-medium">{activeFilePath.split("/").pop()}</span>
          </div>
        )}
        <div className="flex-1" />
        {activeFileLanguage && (
          <span className="text-[10px] text-[#6B7280] uppercase">{activeFileLanguage}</span>
        )}
      </div>

      {/* CodeMirror */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor />
      </div>
    </div>
  );
}
