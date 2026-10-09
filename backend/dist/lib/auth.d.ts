export declare const auth: import("better-auth").Auth<{
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    emailAndPassword: {
        enabled: true;
    };
    advanced: {
        database: {
            generateId: "uuid";
        };
    };
    user: {
        additionalFields: {
            firstName: {
                type: "string";
                required: true;
            };
            lastName: {
                type: "string";
                required: true;
            };
            phoneNumber: {
                type: "string";
                required: false;
            };
            role: {
                type: "string";
                required: true;
                defaultValue: string;
                input: false;
            };
            status: {
                type: "string";
                required: true;
                defaultValue: string;
                input: false;
            };
            termsAcceptedAt: {
                type: "date";
                required: false;
                input: false;
            };
            termsVersion: {
                type: "string";
                required: false;
                input: false;
            };
        };
    };
}>;
//# sourceMappingURL=auth.d.ts.map