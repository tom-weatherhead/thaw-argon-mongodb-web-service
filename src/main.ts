// thaw-argon-mongodb-web-service/src/main.ts

// REST API:
// - GET    http://server:port/database/collection : Read all items in collection
// - GET    http://server:port/database/collection/id : Read the item in collection such that item._id === id. Returns 200 (found) or 404 (not found)
// - POST   http://server:port/database/collection : Insert an item into the collection
// - PUT    http://server:port/database/collection/id : Update (or upsert?) the item from the collection where item._id === id. Returns 200 (found) or 404 (not found)
// - DELETE http://server:port/database/collection : Delete an item from the collection
// - DELETE http://server:port/database/collection/id : Delete the item from the collection where item._id === id. Returns 200 (found) or 404 (not found)

// To test using curl:
// Create one: curl --header "Content-Type: application/json" --request POST --data '{"key1":"value1"}' http://localhost:8080
// Read all: curl http://localhost:8080
// Delete all: curl -X DELETE http://localhost:8080

import { createServer, IncomingMessage, ServerResponse } from 'http';

import { Socket } from 'net';

import {
	createConnection,
	IPromisifiedCollection,
	IPromisifiedConnection
} from 'thaw-argon-promisified-mongodb';

// import { safeJsonParse } from 'thaw-common-utilities.ts';

const mongoDBServerName = 'localhost';

const mongoDBServerPort = 27017;

// const defaultDatabaseName = 'test1';
// const defaultCollectionName = 'collection1';
const defaultId = '';

// const defaultPort = 9898; // Chinese for 'eternally rich, eternally rich'
// const defaultPort = 8000; // Less of a smart-ass port number.
const defaultPort = 8080;
const port = Number.parseInt(process.argv.slice(-1)[0], 10) || defaultPort;
const lineEndingInResponse = '\r\n';

function respondWithStatusCode(
	res: ServerResponse,
	statusCode: number,
	message?: string,
	responseBody?: string
): void {
	const isError = statusCode >= 400;
	const responseWillHaveBody = !isError && responseBody;

	// console.log(
	// 	`HTTP ${isError ? 'error' : 'status'} ${statusCode}:`,
	// 	message
	// );

	if (responseWillHaveBody) {
		res.setHeader('Content-Type', 'application/json; charset=utf-8');
	}

	res.setHeader('Access-Control-Allow-Origin', '*'); // To support CORS (cross-origin resource sharing?)
	res.writeHead(statusCode);
	// res.write(`${lineEndingInResponse}`);

	if (responseWillHaveBody) {
		res.write(`${responseBody}${lineEndingInResponse}`);
	}

	res.end();
}

function respondWithStatus200(res: ServerResponse, responseBody?: string) {
	respondWithStatusCode(res, 200, 'OK', responseBody);
}

function respondWithStatus400(
	req: IncomingMessage,
	res: ServerResponse,
	message: string
) {
	respondWithStatusCode(
		res,
		400,
		`URL '${req.url}' is a bad request; ${message}`
	);
}

function constructPostBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let body = '';

		req.on('readable', function() {
			body += req.read();
		});

		req.on('end', function() {
			const trimmedBody = body.substring(0, body.length - 4);

			// console.log('The raw request body is:\n\n', body, '\n');
			console.log(`The trimmed request body is [${trimmedBody}]\n`);

			resolve(trimmedBody);
		});
	});
}

async function handlePost(
	req: IncomingMessage,
	res: ServerResponse,
	databaseName: string,
	collectionName: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		const bodyAsString = await constructPostBody(req);
		const dataToInsert = JSON.parse(bodyAsString);

		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const collection = client.getCollection(databaseName, collectionName);

		const result = await collection.createOne(dataToInsert);

		// console.log('POST: typeof result is:', typeof result);
		console.log('POST: result is:', result);

		respondWithStatusCode(res, 201);
	} finally {
		fnCleanup();
	}
}

async function handleGetOne(
	res: ServerResponse,
	databaseName: string,
	collectionName: string,
	id: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		console.log('GET one: id is:', id);

		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const record = await client
			.getCollection(databaseName, collectionName)
			.readOneById(id);

		console.log(`GET one ${id}: record is:`, typeof record, record);

		if (record === null) {
			respondWithStatusCode(res, 404);
		} else {
			respondWithStatus200(res, JSON.stringify(record));
		}
	} finally {
		fnCleanup();
	}
}

async function handleGetAll(
	res: ServerResponse,
	databaseName: string,
	collectionName: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const records = await client
			.getCollection(databaseName, collectionName)
			.readAll();

		console.log(
			`GET all: Returning ${records.length} record(s):`,
			typeof records,
			records
		);

		respondWithStatus200(res, JSON.stringify(records));
	} finally {
		fnCleanup();
	}
}

async function handleUpdateOne(
	req: IncomingMessage,
	res: ServerResponse,
	databaseName: string,
	collectionName: string,
	id: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		const bodyAsString = await constructPostBody(req);
		const replacementData = JSON.parse(bodyAsString);

		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const records = await client
			.getCollection(databaseName, collectionName)
			.updateOneById(id, replacementData);

		// console.log(
		// 	`GET: Returning ${records.length} record(s):`,
		// 	typeof records,
		// 	records
		// );

		// TODO: Return status code 404 if no such record is found.
		respondWithStatus200(res, JSON.stringify(records));
	} finally {
		fnCleanup();
	}
}

async function handleDeleteOne(
	res: ServerResponse,
	databaseName: string,
	collectionName: string,
	id: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const result = await client
			.getCollection(databaseName, collectionName)
			.deleteOneById(id);

		console.log('DELETE one: result is:', typeof result, result);
		respondWithStatus200(res);
	} finally {
		fnCleanup();
	}
}

async function handleDeleteAll(
	res: ServerResponse,
	databaseName: string,
	collectionName: string
): Promise<void> {
	let fnCleanup = () => {};

	try {
		const client = await createConnection(
			mongoDBServerName,
			mongoDBServerPort,
			databaseName
		);

		fnCleanup = () => {
			client.destroy();
		};

		// mongodb-1.4.40: HISTORY:- NODE-246 Cursors are inefficiently constructed and consequently cannot be promisified.

		const result = await client
			.getCollection(databaseName, collectionName)
			.deleteAll();

		console.log('DELETE all: result is:', typeof result, result);
		respondWithStatus200(res);
	} finally {
		fnCleanup();
	}
}

const server = createServer(
	async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
		try {
			const method = req.method || '';
			console.log(`\nReceived a ${method} request.\n`);

			const urlComponents = (req.url || '')
				.split('/')
				.filter((str: string) => str.length > 0);

			const acceptedNumbersOfUrlComponents: Record<string, number[]> = {
				GET: [2, 3],
				POST: [2],
				PUT: [3],
				DELETE: [2, 3]
			};
			const acceptedNumbersOfUrlComponentsForMethod:
				| number[]
				| undefined = acceptedNumbersOfUrlComponents[method];

			if (
				typeof acceptedNumbersOfUrlComponentsForMethod === 'undefined'
			) {
				respondWithStatus400(req, res, 'Unexpected HTTP method');

				return;
			} else if (
				acceptedNumbersOfUrlComponentsForMethod.indexOf(
					urlComponents.length
				) < 0
			) {
				respondWithStatus400(
					req,
					res,
					'Unexpected number of URL components'
				);

				return;
			}

			const databaseName = urlComponents[0];
			const collectionName = urlComponents[1];
			const id = urlComponents.length >= 3 ? urlComponents[2] : defaultId;

			switch (method) {
				case 'POST':
					await handlePost(req, res, databaseName, collectionName);
					break;

				case 'GET':
					if (id === defaultId) {
						await handleGetAll(res, databaseName, collectionName);
					} else {
						await handleGetOne(
							res,
							databaseName,
							collectionName,
							id
						);
					}

					break;

				case 'PUT':
					await handleUpdateOne(
						req,
						res,
						databaseName,
						collectionName,
						id
					);
					break;

				case 'DELETE':
					if (id === defaultId) {
						await handleDeleteAll(
							res,
							databaseName,
							collectionName
						);
					} else {
						await handleDeleteOne(
							res,
							databaseName,
							collectionName,
							id
						);
					}

					break;

				default:
					throw new Error(`Unhandled method: '${req.method}'`);
			}
		} catch (error) {
			console.error('Exception caught:', typeof error, error);
			respondWithStatusCode(res, 500);
		}
	}
);

server.on('clientError', (err: Error, socket: Socket): void => {
	socket.end(
		`HTTP/1.1 400 Bad Request${lineEndingInResponse}${lineEndingInResponse}`
	);
});

server.listen(port);

console.log(`The MongoDB API server is now listening on port ${port}`);
