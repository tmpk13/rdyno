const vscode = acquireVsCodeApi();
function send(cmd) { vscode.postMessage({ command: cmd }); }

window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.command === 'init') {
        const { hasConfig, boardName } = msg.data;
        document.getElementById('np-hint').style.display = hasConfig ? 'none' : '';
        const boardSection = document.getElementById('np-board');
        boardSection.style.display = hasConfig ? '' : 'none';
        if (hasConfig) {
            document.getElementById('np-board-name').textContent = boardName;
        }
    }
});
