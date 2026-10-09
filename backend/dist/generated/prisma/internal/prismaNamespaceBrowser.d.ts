import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models.js';
export type * from './prismaNamespace.js';
export declare const Decimal: typeof runtime.Decimal;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
/**
 * Helper for filtering JSON entries that have `null` on the database (empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const DbNull: import("@prisma/client-runtime-utils").DbNullClass;
/**
 * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const JsonNull: import("@prisma/client-runtime-utils").JsonNullClass;
/**
 * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
 */
export declare const AnyNull: import("@prisma/client-runtime-utils").AnyNullClass;
export declare const ModelName: {
    readonly User: 'User';
    readonly Session: 'Session';
    readonly Account: 'Account';
    readonly Verification: 'Verification';
    readonly OrganizerProfile: 'OrganizerProfile';
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export declare const TransactionIsolationLevel: {
    readonly ReadUncommitted: 'ReadUncommitted';
    readonly ReadCommitted: 'ReadCommitted';
    readonly RepeatableRead: 'RepeatableRead';
    readonly Serializable: 'Serializable';
};
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const UserScalarFieldEnum: {
    readonly id: 'id';
    readonly name: 'name';
    readonly email: 'email';
    readonly emailVerified: 'emailVerified';
    readonly image: 'image';
    readonly createdAt: 'createdAt';
    readonly updatedAt: 'updatedAt';
    readonly firstName: 'firstName';
    readonly lastName: 'lastName';
    readonly phoneNumber: 'phoneNumber';
    readonly role: 'role';
    readonly status: 'status';
    readonly termsAcceptedAt: 'termsAcceptedAt';
    readonly termsVersion: 'termsVersion';
};
export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];
export declare const SessionScalarFieldEnum: {
    readonly id: 'id';
    readonly expiresAt: 'expiresAt';
    readonly token: 'token';
    readonly createdAt: 'createdAt';
    readonly updatedAt: 'updatedAt';
    readonly ipAddress: 'ipAddress';
    readonly userAgent: 'userAgent';
    readonly userId: 'userId';
};
export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum];
export declare const AccountScalarFieldEnum: {
    readonly id: 'id';
    readonly accountId: 'accountId';
    readonly providerId: 'providerId';
    readonly userId: 'userId';
    readonly accessToken: 'accessToken';
    readonly refreshToken: 'refreshToken';
    readonly idToken: 'idToken';
    readonly accessTokenExpiresAt: 'accessTokenExpiresAt';
    readonly refreshTokenExpiresAt: 'refreshTokenExpiresAt';
    readonly scope: 'scope';
    readonly password: 'password';
    readonly createdAt: 'createdAt';
    readonly updatedAt: 'updatedAt';
};
export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum];
export declare const VerificationScalarFieldEnum: {
    readonly id: 'id';
    readonly identifier: 'identifier';
    readonly value: 'value';
    readonly expiresAt: 'expiresAt';
    readonly createdAt: 'createdAt';
    readonly updatedAt: 'updatedAt';
};
export type VerificationScalarFieldEnum = (typeof VerificationScalarFieldEnum)[keyof typeof VerificationScalarFieldEnum];
export declare const OrganizerProfileScalarFieldEnum: {
    readonly id: 'id';
    readonly userId: 'userId';
    readonly organizationName: 'organizationName';
    readonly description: 'description';
    readonly approvalStatus: 'approvalStatus';
    readonly approvedAt: 'approvedAt';
    readonly approvedById: 'approvedById';
    readonly createdAt: 'createdAt';
    readonly updatedAt: 'updatedAt';
};
export type OrganizerProfileScalarFieldEnum = (typeof OrganizerProfileScalarFieldEnum)[keyof typeof OrganizerProfileScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: 'asc';
    readonly desc: 'desc';
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export declare const QueryMode: {
    readonly default: 'default';
    readonly insensitive: 'insensitive';
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const NullsOrder: {
    readonly first: 'first';
    readonly last: 'last';
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];
//# sourceMappingURL=prismaNamespaceBrowser.d.ts.map