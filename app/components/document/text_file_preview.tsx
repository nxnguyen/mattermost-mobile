// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {File, Paths} from 'expo-file-system';
import React, {useEffect, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Modal, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';

import {downloadFile} from '@actions/remote/file';
import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {buildIsolatedHtmlPreview, getTextPreviewType, MAX_TEXT_PREVIEW_BYTES} from '@utils/document/preview';
import {generateId} from '@utils/general';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const messages = defineMessages({
    close: {id: 'amobi.document_preview.close', defaultMessage: 'Close'},
    failed: {id: 'amobi.document_preview.failed', defaultMessage: 'Unable to preview this file. Please try again.'},
    tooLarge: {id: 'amobi.document_preview.too_large', defaultMessage: 'This file is too large to preview. The preview limit is 500 KB.'},
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {flex: 1, backgroundColor: theme.centerChannelBg},
    header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8},
    filename: {flex: 1, color: theme.centerChannelColor, ...typography('Body', 200, 'SemiBold')},
    content: {padding: 16},
    text: {color: theme.centerChannelColor, ...typography('Body', 200)},
    loading: {flex: 1, justifyContent: 'center'},
    webview: {flex: 1, backgroundColor: theme.centerChannelBg},
}));

const PREVIEW_ORIGINS = ['about:*'];
const allowPreviewNavigation = ({url}: {url: string}) => url === 'about:blank' || url === 'about:srcdoc' || url.startsWith('about:srcdoc#');

type Props = {file: FileInfo; onClose: () => void};

export default function TextFilePreview({file, onClose}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const {formatMessage} = useIntl();
    const [content, setContent] = useState<string>();
    const [error, setError] = useState<keyof typeof messages>();
    const type = getTextPreviewType(file);
    const source = useMemo(() => ({html: buildIsolatedHtmlPreview(content || ''), baseUrl: 'about:blank'}), [content]);

    useEffect(() => {
        let active = true;
        let task: ReturnType<typeof downloadFile> | undefined;
        const temporary = new File(Paths.cache, `amobi-preview-${generateId()}`);
        const read = async () => {
            try {
                if (file.size > MAX_TEXT_PREVIEW_BYTES) {
                    setError('tooLarge');
                    return;
                }
                const local = file.localPath ? new File(file.localPath) : undefined;
                let previewFile = local?.exists ? local : temporary;
                if (previewFile === temporary) {
                    if (!file.id) {
                        setError('failed');
                        return;
                    }
                    task = downloadFile(serverUrl, file.id, temporary.uri);
                    const response = await task;
                    if (!response.ok) {
                        throw new Error('File preview unavailable');
                    }
                    previewFile = temporary;
                }
                if (previewFile.size > MAX_TEXT_PREVIEW_BYTES) {
                    if (active) {
                        setError('tooLarge');
                    }
                    return;
                }
                const text = await previewFile.text();
                if (active) {
                    setContent(text);
                }
            } catch {
                if (active) {
                    setError('failed');
                }
            } finally {
                if (temporary.exists) {
                    temporary.delete();
                }
            }
        };
        read();
        return () => {
            active = false;
            task?.cancel?.();
        };
    }, [file.id, file.localPath, file.size, serverUrl]);

    return (
        <Modal
            animationType='slide'
            onRequestClose={onClose}
        >
            <SafeAreaView
                style={style.container}
                testID='document.text_preview'
            >
                <View style={style.header}>
                    <Text
                        numberOfLines={1}
                        style={style.filename}
                    >{file.name}</Text>
                    <Button
                        theme={theme}
                        text={formatMessage(messages.close)}
                        onPress={onClose}
                        testID='document.text_preview.close'
                    />
                </View>
                {error && (
                    <FormattedText
                        style={style.text}
                        {...messages[error]}
                    />
                )}
                {!error && content === undefined && (
                    <Loading
                        containerStyle={style.loading}
                        themeColor='buttonBg'
                    />
                )}
                {!error && content !== undefined && type === 'markdown' && (
                    <ScrollView
                        contentContainerStyle={style.content}
                        testID='document.text_preview.markdown'
                    >
                        <Markdown
                            value={content}
                            theme={theme}
                            baseTextStyle={style.text}
                            location={Screens.GALLERY}
                            disableAtMentions={true}
                            disableChannelLink={true}
                        />
                    </ScrollView>
                )}
                {!error && content !== undefined && type === 'html' && (
                    <WebView
                        style={style.webview}
                        testID='document.text_preview.html'
                        source={source}
                        originWhitelist={PREVIEW_ORIGINS}
                        onShouldStartLoadWithRequest={allowPreviewNavigation}
                        javaScriptEnabled={true}
                        javaScriptCanOpenWindowsAutomatically={false}
                        setSupportMultipleWindows={false}
                        incognito={true}
                        sharedCookiesEnabled={false}
                        thirdPartyCookiesEnabled={false}
                        domStorageEnabled={false}
                        allowFileAccess={false}
                        allowFileAccessFromFileURLs={false}
                        allowUniversalAccessFromFileURLs={false}
                        mixedContentMode='never'
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}
