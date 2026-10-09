export declare const UserRole: {
    readonly ATTENDEE: 'ATTENDEE';
    readonly ORGANIZER: 'ORGANIZER';
    readonly ADMINISTRATOR: 'ADMINISTRATOR';
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const UserStatus: {
    readonly ACTIVE: 'ACTIVE';
    readonly DISABLED: 'DISABLED';
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export declare const OrganizerStatus: {
    readonly PENDING: 'PENDING';
    readonly APPROVED: 'APPROVED';
    readonly REJECTED: 'REJECTED';
    readonly SUSPENDED: 'SUSPENDED';
};
export type OrganizerStatus = (typeof OrganizerStatus)[keyof typeof OrganizerStatus];
//# sourceMappingURL=enums.d.ts.map