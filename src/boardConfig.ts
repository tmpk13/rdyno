import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as TOML from "@iarna/toml";
import { getGlobalBoardsDir } from "./boardLibrary";
import { getBoardDir, getDefaultBoardFile } from "./projectConfig";

export { getBoardDir } from "./projectConfig";

export interface NewProjectFile {
  path: string;
  content: string;
  replace_if_exists?: boolean;
  append_if_exists?: boolean;
}

export interface GenerateCommand {
  label: string;
  command: string;
}

export interface NewProjectConfig {
  /** Resolved files array, or raw newline-separated file list from TOML */
  files?: NewProjectFile[] | string;
  /** Files that should overwrite existing ones (newline-separated list) */
  replace?: string;
  /** Optional cargo dependencies to append to Cargo.toml */
  dependencies?: string;
  /** Optional cargo build-dependencies to append to Cargo.toml */
  "build-dependencies"?: string;
  /** Optional .cargo/config.toml runner line */
  runner?: string;
  /** Optional generate command(s) — string for one, array of {label, command} for multiple */
  generate?: string | GenerateCommand[];
}

/** Get resolved files array from a NewProjectConfig (always NewProjectFile[] after resolveFiles) */
export function getProjectFiles(np: NewProjectConfig): NewProjectFile[] {
  return Array.isArray(np.files) ? np.files : [];
}

export interface ToolInstallConfig {
  /** Name of the CLI tool (e.g. "probe-rs", "espflash") */
  name: string;
  /** Command to check if the tool exists (e.g. "probe-rs --version") */
  check?: string;
  /** Install commands per platform */
  install?: {
    linux?: string;
    mac?: string;
    win?: string;
  };
  /** Message shown after successful install (e.g. "Restart your terminal") */
  success_message?: string;
}

export interface ActionConfig {
  label?: string;
  color?: string;
}

export interface PanelLayout {
  order: string[];
  hidden: string[];
}

export interface BoardConfig {
  board: { name: string; chip: string; target: string; elf?: string };
  probe?: { protocol: string; speed: number; port?: string };
  flash: Record<string, unknown>;
  rtt: { enabled: boolean; channels: { up: number; name: string }[]; command?: string };
  run?: { command?: string };
  tool?: ToolInstallConfig;
  new_project?: NewProjectConfig;
  actions?: Record<string, ActionConfig>;
  layout?: PanelLayout;
}

/** Parse newline-separated file list string into trimmed non-empty lines */
function parseFileList(raw: string): string[] {
  return raw.split("\n").map(l => l.trim()).filter(Boolean);
}

/**
 * Resolve new_project.files from the board directory.
 * If files is a newline-separated string, read each file from the
 * new_project/ subdirectory next to dynoboard.toml and build
 * the NewProjectFile[] array.
 */
function resolveFiles(raw: BoardConfig, boardDir: string): void {
  const np = raw.new_project;
  if (!np || typeof np.files !== "string") { return; }

  const filePaths = parseFileList(np.files);
  const replaceSet = new Set(np.replace ? parseFileList(np.replace) : []);
  const newProjectDir = path.join(boardDir, "new_project");
  const arr: NewProjectFile[] = [];

  for (const filePath of filePaths) {
    const src = path.join(newProjectDir, filePath);
    if (!fs.existsSync(src)) { continue; }
    arr.push({
      path: filePath,
      content: fs.readFileSync(src, "utf-8"),
      replace_if_exists: replaceSet.has(filePath) || undefined,
    });
  }

  np.files = arr;
}

let activeBoard: BoardConfig | undefined;
let activeBoardFile: string | undefined;
let activeBoardPath: string | undefined;
let portOverride: string | undefined;

export function ensureBoardDir(_extensionPath: string): void {
  // No-op: .rustdyno is now created explicitly via setupBoardDir() or new project creation
}

export function setupBoardDir(extensionPath: string): void {
  const dir = getBoardDir();
  if (fs.existsSync(dir)) { return; }
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(extensionPath, "boards", "esp32c3");
  if (fs.existsSync(src)) {
    copyDirRecursive(src, path.join(dir, "esp32c3"));
  }
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) { copyDirRecursive(s, d); }
    else { fs.copyFileSync(s, d); }
  }
}

export function getLayout(): PanelLayout | undefined {
  const layout = activeBoard?.layout;
  if (!layout) { return undefined; }
  return {
    order: Array.isArray(layout.order) ? layout.order : [],
    hidden: Array.isArray(layout.hidden) ? layout.hidden : [],
  };
}

export function setBoardElf(elf: string): void {
  if (!activeBoardPath || !activeBoard) { return; }
  activeBoard.board.elf = elf;
  let data: TOML.JsonMap;
  try { data = TOML.parse(fs.readFileSync(activeBoardPath, "utf-8")) as TOML.JsonMap; }
  catch { data = {}; }
  (data.board as TOML.JsonMap).elf = elf;
  fs.writeFileSync(activeBoardPath, TOML.stringify(data), "utf-8");
}

export function setLayout(layout: PanelLayout): void {
  if (!activeBoardPath || !activeBoard) { return; }
  activeBoard.layout = layout;
  let data: TOML.JsonMap;
  try { data = TOML.parse(fs.readFileSync(activeBoardPath, "utf-8")) as TOML.JsonMap; }
  catch { data = {}; }
  data.layout = layout as unknown as TOML.JsonMap;
  fs.writeFileSync(activeBoardPath, TOML.stringify(data), "utf-8");
}

export function autoSelectBoard(): BoardConfig | undefined {
  const boards = listBoards();
  if (boards.length === 0) { return undefined; }
  const defaultFile = getDefaultBoardFile();
  const toSelect = (defaultFile && boards.includes(defaultFile)) ? defaultFile : boards[0];
  return selectBoardByFile(toSelect);
}

export function listBoards(): string[] {
  const dirs = [getBoardDir(), getGlobalBoardsDir()].filter(Boolean) as string[];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) { continue; }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Directory-based board: subdir containing dynoboard.toml
      if (entry.isDirectory() && !entry.name.startsWith(".") && !seen.has(entry.name)) {
        const toml = path.join(dir, entry.name, "dynoboard.toml");
        if (fs.existsSync(toml)) {
          seen.add(entry.name);
          result.push(entry.name);
        }
      }
    }
  }
  return result;
}

export function selectBoardByFile(filename: string): BoardConfig | undefined {
  // filename is the board directory name (e.g. "nrf52840")
  const wsDir = path.join(getBoardDir(), filename);
  const globalDir = getGlobalBoardsDir();
  const globalBoardDir = globalDir ? path.join(globalDir, filename) : undefined;

  const wsToml = path.join(wsDir, "dynoboard.toml");
  const globalToml = globalBoardDir ? path.join(globalBoardDir, "dynoboard.toml") : undefined;

  const filePath = fs.existsSync(wsToml) ? wsToml
    : (globalToml && fs.existsSync(globalToml) ? globalToml : wsToml);

  if (!fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`Board config not found: ${filePath}`);
    return;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  activeBoard = TOML.parse(raw) as unknown as BoardConfig;
  resolveFiles(activeBoard, path.dirname(filePath));
  activeBoardFile = filename;
  activeBoardPath = filePath;
  return activeBoard;
}

export async function selectBoard(): Promise<BoardConfig | undefined> {
  const dir = getBoardDir();
  if (!fs.existsSync(dir)) {
    vscode.window.showErrorMessage(`Board config dir not found: ${dir}`);
    return;
  }

  const files = listBoards();
  const pick = await vscode.window.showQuickPick(files, { placeHolder: "Select board config" });
  if (!pick) { return; }

  activeBoard = selectBoardByFile(pick);
  if (activeBoard) {
    vscode.window.showInformationMessage(`Board: ${activeBoard.board.name}`);
  }
  return activeBoard;
}

export function getActiveBoard(): BoardConfig | undefined {
  return activeBoard;
}

export function getActiveBoardFile(): string | undefined {
  return activeBoardFile;
}

export function getPortOverride(): string | undefined {
  return portOverride;
}

export function setPortOverride(port: string | undefined): void {
  portOverride = port;
}

export function getEffectivePort(): string | undefined {
  return portOverride ?? activeBoard?.probe?.port;
}
