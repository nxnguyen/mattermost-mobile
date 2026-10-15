// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type FocalboardPropertyOption = {
    id: string;
    value: string;
    color?: string;
    [key: string]: unknown;
};

export type FocalboardProperty = {
    id: string;
    name: string;
    type: string;
    options?: FocalboardPropertyOption[];
    [key: string]: unknown;
};

export type FocalboardBoard = {
    id: string;
    teamId: string;
    title: string;
    type: string;
    minimumRole: string;
    cardProperties: FocalboardProperty[];
    deleteAt?: number;
    isTemplate?: boolean;
    [key: string]: unknown;
};

export type ContentOrder = Array<string | string[]>;

export type FocalboardBlockFields = {
    properties?: Record<string, unknown>;
    contentOrder?: ContentOrder;
    viewType?: string;
    groupById?: string;
    visibleOptionIds?: string[];
    hiddenOptionIds?: string[];
    columnOrder?: string[];
    cardOrder?: string[];
    isTemplate?: boolean;
    [key: string]: unknown;
};

export type FocalboardBlock = {
    id: string;
    parentId: string;
    boardId: string;
    title: string;
    type: string;
    fields: FocalboardBlockFields;
    schema: number;
    createdBy: string;
    modifiedBy: string;
    createAt: number;
    updateAt: number;
    deleteAt: number;
    [key: string]: unknown;
};

export type FocalboardBlockPatch = {
    title?: string;
    updatedFields?: {
        properties?: Record<string, unknown>;
        contentOrder?: ContentOrder;
    };
};

export type FocalboardBoardMember = {
    boardId: string;
    userId: string;
    roles?: string;
    minimumRole?: string;
    schemeAdmin?: boolean;
    schemeEditor?: boolean;
    schemeCommenter?: boolean;
    schemeViewer?: boolean;
    synthetic?: boolean;
    [key: string]: unknown;
};

export type KanbanColumn = {
    id: string;
    title: string;
    color?: string;
    cards: FocalboardBlock[];
};

export type CardChanges = {
    title?: string;
    status?: {propertyId: string; optionId: string};
    contentOrder?: ContentOrder;
};

export type DescriptionUpdate = {
    blocks: FocalboardBlock[];
    patches: Array<{blockId: string; patch: FocalboardBlockPatch}>;
    cardPatch: FocalboardBlockPatch;
};
