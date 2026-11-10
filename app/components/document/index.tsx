// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forwardRef, useImperativeHandle, type ReactNode, useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {alertDownloadDocumentDisabled, alertOnlyPDFSupported} from '@utils/document';
import {getTextPreviewType} from '@utils/document/preview';
import {isPdf} from '@utils/file';

import TextFilePreview from './text_file_preview';

export type DocumentRef = {
    handlePreviewPress: () => void;
}

type DocumentProps = {
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
    file: FileInfo;
    children: ReactNode;
    downloadAndPreviewFile: (file: FileInfo) => void;
}

const Document = forwardRef<DocumentRef, DocumentProps>(({canDownloadFiles, children, downloadAndPreviewFile, enableSecureFilePreview, file}: DocumentProps, ref) => {
    const intl = useIntl();
    const [previewOpen, setPreviewOpen] = useState(false);
    const closePreview = useCallback(() => setPreviewOpen(false), []);

    const handlePreviewPress = useCallback(async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        if (getTextPreviewType(file)) {
            setPreviewOpen(true);
            return;
        }

        if (enableSecureFilePreview && !isPdf(file)) {
            alertOnlyPDFSupported(intl);
            return;
        }

        downloadAndPreviewFile(file);
    }, [canDownloadFiles, enableSecureFilePreview, downloadAndPreviewFile, file, intl]);

    useImperativeHandle(ref, () => ({
        handlePreviewPress,
    }), [handlePreviewPress]);

    return (
        <>
            {children}
            {previewOpen && (
                <TextFilePreview
                    file={file}
                    onClose={closePreview}
                />
            )}
        </>
    );
});

Document.displayName = 'Document';

export default Document;
