"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const google_auth_library_1 = require("google-auth-library");
const googleapis_1 = require("googleapis");
const xtrn_server_1 = require("xtrn-server");
const zod_1 = require("zod");
const access_token_map = new Map();
const server = new xtrn_server_1.XTRNServer("google-calendar-xtrn-server", "1.0.0", (0, xtrn_server_1.defineConfig)({
    oauth: {
        provider: "google-calendar",
    },
}));
const authMW = server.createMiddleware(async (req, _res, next) => {
    const client = new google_auth_library_1.OAuth2Client(server.oauth?.client_id, server.oauth?.client_secret, "http://localhost");
    const now = Date.now();
    const token = access_token_map.get(req.refreshToken);
    if (token && now < token.expiresAt) {
        client.setCredentials({ access_token: token.access_token });
    }
    else {
        client.setCredentials({ refresh_token: req.refreshToken });
        const { credentials } = await client.refreshAccessToken();
        if (!credentials.access_token || !credentials.expiry_date) {
            throw new Error("Missing access token fields in credentials object. Try again.");
        }
        client.setCredentials({ access_token: credentials.access_token });
        access_token_map.set(req.refreshToken, {
            access_token: credentials.access_token,
            expiresAt: credentials.expiry_date,
        });
    }
    return next({ oauthClient: client });
});
server.registerTool("create-event", "Creates a new event", zod_1.z.object({
    summary: zod_1.z.string().describe("Event title"),
    start: zod_1.z.object({
        dateTime: zod_1.z.string().describe("Start time (ISO format)"),
        timeZone: zod_1.z.string().describe("Time zone"),
    }),
    end: zod_1.z.object({
        dateTime: zod_1.z.string().describe("End time (ISO format)"),
        timeZone: zod_1.z.string().describe("Time zone"),
    }),
    description: zod_1.z.string().optional().describe("Event description"),
    location: zod_1.z.string().optional().describe("Event location"),
    reminders: zod_1.z
        .object({
        useDefault: zod_1.z
            .boolean()
            .optional()
            .describe("Use default reminders (true) or custom reminders (false)"),
        overrides: zod_1.z
            .array(zod_1.z.object({
            method: zod_1.z.enum(["email", "popup"]).describe("Reminder method"),
            minutes: zod_1.z
                .number()
                .describe("Minutes before event to send reminder"),
        }))
            .optional()
            .describe("Custom reminder overrides - only used when useDefault is false"),
    })
        .optional()
        .describe("Event reminders/notifications configuration"),
}), async (req, res) => {
    try {
        const oauthClient = req.oauthClient;
        const calendar = googleapis_1.google.calendar({ version: "v3", auth: oauthClient });
        const event = {
            summary: req.summary,
            start: {
                dateTime: req.start.dateTime,
                timeZone: req.start.timeZone,
            },
            end: {
                dateTime: req.end.dateTime,
                timeZone: req.end.timeZone,
            },
            ...(req.description && { description: req.description }),
            ...(req.location && { location: req.location }),
            ...(req.reminders && {
                reminders: {
                    useDefault: req.reminders.useDefault ?? true,
                    ...(req.reminders.overrides && {
                        overrides: req.reminders.overrides,
                    }),
                },
            }),
        };
        const createdEvent = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
        });
        res.sendJSON({
            success: true,
            event: {
                id: createdEvent.data.id,
                summary: createdEvent.data.summary,
                start: createdEvent.data.start,
                end: createdEvent.data.end,
                description: createdEvent.data.description,
                location: createdEvent.data.location,
                htmlLink: createdEvent.data.htmlLink,
                status: createdEvent.data.status,
            },
        });
    }
    catch (error) {
        console.error("Error creating calendar event:", error);
        res.sendJSON({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
}, [authMW]);
server.run();
//# sourceMappingURL=index.js.map