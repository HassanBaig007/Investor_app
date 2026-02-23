import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const BACKEND_PERMISSIONS: {
    VIEW_PORTFOLIO: string;
    VIEW_INVESTMENTS: string;
    VIEW_REPORTS: string;
    VIEW_ANALYTICS: string;
    CREATE_PROJECT: string;
    VIEW_PROJECT_DETAILS: string;
    EDIT_PROJECT: string;
    DELETE_PROJECT: string;
    ADD_INVESTOR: string;
    REMOVE_INVESTOR: string;
    VIEW_INVESTOR_LIST: string;
    VOTE_ON_MODIFICATIONS: string;
    CREATE_MODIFICATION: string;
    VIEW_APPROVAL_CHAIN: string;
    VIEW_PROFILE: string;
    EDIT_PROFILE: string;
    VIEW_SETTINGS: string;
    VIEW_ADMIN_DASHBOARD: string;
    MANAGE_USERS: string;
};
export declare function getAllPermissionsForRole(role: string): string[];
export declare class PermissionsGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
