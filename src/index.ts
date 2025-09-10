import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { defineConfig, XTRNServer } from "xtrn-server";
import { z } from "zod";

type AccessToken = {
	access_token: string;
	expiresAt: number;
};

const access_token_map: Map<string, AccessToken> = new Map();

const server = new XTRNServer(
	"google-calendar-xtrn-server",
	"1.0.0",
	defineConfig({
		oauth: {
			provider: "google-calendar",
		},
	}),
);

const authMW = server.createMiddleware(async (req, _res, next) => {
	const client = new OAuth2Client(
		server.oauth?.client_id,
		server.oauth?.client_secret,
		"http://localhost",
	);

	const now = Date.now();

	const token = access_token_map.get(req.refreshToken);

	if (token && now < token.expiresAt) {
		// Use existing token
		client.setCredentials({ access_token: token.access_token });
	} else {
		// Get access token
		client.setCredentials({ refresh_token: req.refreshToken });
		const { credentials } = await client.refreshAccessToken();

		if (!credentials.access_token || !credentials.expiry_date) {
			throw new Error(
				"Missing access token fields in credentials object. Try again.",
			);
		}

		client.setCredentials({ access_token: credentials.access_token });

		access_token_map.set(req.refreshToken, {
			access_token: credentials.access_token,
			expiresAt: credentials.expiry_date,
		});
	}

	return next({ oauthClient: client });
});

server.registerTool(
	"create-event",
	"Creates a new event",
	z.object({
		summary: z.string().describe("Event title"),
		start: z.object({
			dateTime: z.string().describe("Start time (ISO format)"),
			timeZone: z.string().describe("Time zone"),
		}),
		end: z.object({
			dateTime: z.string().describe("End time (ISO format)"),
			timeZone: z.string().describe("Time zone"),
		}),
		description: z.string().optional().describe("Event description"),
		location: z.string().optional().describe("Event location"),
		reminders: z
			.object({
				useDefault: z
					.boolean()
					.optional()
					.describe("Use default reminders (true) or custom reminders (false)"),
				overrides: z
					.array(
						z.object({
							method: z.enum(["email", "popup"]).describe("Reminder method"),
							minutes: z
								.number()
								.describe("Minutes before event to send reminder"),
						}),
					)
					.optional()
					.describe(
						"Custom reminder overrides - only used when useDefault is false",
					),
			})
			.optional()
			.describe("Event reminders/notifications configuration"),
	}),
	async (req, res) => {
		try {
			// Get the authenticated OAuth client from middleware
			const oauthClient = req.oauthClient;

			// Create Google Calendar API client
			const calendar = google.calendar({ version: "v3", auth: oauthClient });

			// Build the event object from the request
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

			// Insert the event into the primary calendar
			const createdEvent = await calendar.events.insert({
				calendarId: "primary",
				requestBody: event,
			});

			// Send success response
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
		} catch (error) {
			console.error("Error creating calendar event:", error);
			res.sendJSON({
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			});
		}
	},
	[authMW],
);

server.run();
