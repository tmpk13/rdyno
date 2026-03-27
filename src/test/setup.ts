import { mock } from "bun:test";

mock.module("vscode", () => ({
    workspace: {
        workspaceFolders: [],
        getConfiguration: () => ({ get: (_key: string, def: unknown) => def }),
    },
    window: {
        createOutputChannel: () => ({
            appendLine: () => {},
            clear: () => {},
            show: () => {},
        }),
        showErrorMessage: () => {},
        showWarningMessage: () => {},
        showInformationMessage: () => Promise.resolve(undefined),
    },
    ProgressLocation: { Notification: 1 },
    Uri: { file: (p: string) => ({ fsPath: p }) },
    commands: { executeCommand: () => {} },
}));
