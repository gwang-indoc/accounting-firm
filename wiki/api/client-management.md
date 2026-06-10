# Client Management API

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-client-management](../../raw/api/openspec-client-management.md)

## Overview

A simple CRUD API for managing client records. All endpoints require authentication. Clients have a required `name` field and optional `email` and `phone` fields.

## Endpoints

### Create Client

`POST /api/clients`

Request body: `{ name (required), email (optional), phone (optional) }`

| Condition | Response |
|---|---|
| Valid name provided | 201 — returns client JSON |
| Missing name | 400 Bad Request |

### List All Clients

`GET /api/clients`

Returns 200 with a JSON array of all clients. Returns an empty array when no clients exist.

### Get Single Client

`GET /api/clients/{clientId}`

| Condition | Response |
|---|---|
| Client exists | 200 — returns client JSON |
| Client not found | 404 Not Found |

## See Also

- [Document Management API](document-management.md)
- [Contact Form](contact-form.md)
