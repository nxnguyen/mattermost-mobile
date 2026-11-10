// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const MAX_TEXT_PREVIEW_BYTES = 500 * 1024;

export function getTextPreviewType(file: Pick<FileInfo, 'extension' | 'name'>): 'markdown' | 'html' | undefined {
    const extension = (file.extension || file.name.split('.').pop() || '').toLowerCase();
    if (extension === 'md' || extension === 'markdown') {
        return 'markdown';
    }
    if (extension === 'html' || extension === 'htm') {
        return 'html';
    }
    return undefined;
}

const CHILD_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
const OUTER_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; frame-src about:; connect-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";

// The uploaded document runs in an iframe with an opaque origin, separate from
// the WebView's parent document. Its CSP precedes all uploaded bytes, so extra
// CSP meta tags in an upload can only make the policy more restrictive.
export function buildIsolatedHtmlPreview(content: string): string {
    const document = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${CHILD_CSP}"><meta name="referrer" content="no-referrer">${content}`;
    const srcdoc = document.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${OUTER_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}body{background:white}</style></head><body><iframe title="File preview" sandbox="allow-scripts" srcdoc="${srcdoc}"></iframe></body></html>`;
}
