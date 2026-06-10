# User Guide Design

**Date:** 2026-05-25  
**Scope:** Create a comprehensive PDF user guide for both client and admin users of the GWH Accounting platform

## Overview

A single modular PDF document with quick-start guides for both audiences, followed by detailed feature sections. All 13 screenshots from README.md embedded with captions and callouts. Designed for distribution to users and easy navigation via PDF bookmarks.

## Target Audience

- **Primary:** Clients and admin staff using the platform
- **Secondary:** Support team distributing to users
- **Use case:** Onboarding new users, self-service reference during platform use

## Document Structure

### Part 1: Cover & Navigation
- Title page (GWH Accounting User Guide)
- Brief description of what the platform is
- Table of Contents (with PDF bookmarks for navigation)

### Part 2: Quick-Start Guides

#### For Clients (2-3 pages)
- What the client portal is
- How to sign in (Google OAuth2 flow)
- Your first login: Dashboard overview
- Common tasks workflow:
  1. Upload a document (W2, 1099)
  2. Download a tax return
  3. Send a message to your accountant
  4. Check for replies
- Where to go for help

#### For Admin Staff (2-3 pages)
- What the admin panel is
- How to sign in (same OAuth2 flow)
- Your first login: Client roster
- Common tasks workflow:
  1. Find and open a client
  2. Upload a document on their behalf
  3. View client messages
  4. Reply to a client query
- Where to go for help

### Part 3: Public Site Features
- **Home & Navigation** (screenshot 01-home-hero.png)
- **Services Overview** (screenshot 03-services.png)
  - What: Six service offerings
  - How to use: Learn about offerings, decide what to book
- **Security & Trust** (screenshot 04-security.png)
  - What: Platform security features (AES-256, OAuth2, RBAC, isolated storage)
  - How to use: Understanding your data protection
- **Contact & Consultation**
  - Contact page (screenshot 05-contact.png)
  - Book consultation form (screenshot 06-book-consultation.png)
  - How to submit inquiry, what happens next

### Part 4: Client Portal

#### Getting Started
- Login flow (screenshot 02-login.png with callouts on OAuth2 button)
- What to expect after first sign-in
- Account security best practices

#### Dashboard
- **What:** Your personalized view of documents, messages, and account status
- **Screenshot:** 07-portal-dashboard.png (annotated with callouts for document count, latest year, message threads)
- **How to use:** Understand the stats, navigate to documents or messages from here
- **Pro tip:** Check the dashboard regularly for new messages from your accountant

#### Document Management
- **What:** Upload tax documents (W2s, 1099s), download firm-prepared returns
- **Screenshot:** 08-portal-documents.png
- **How to use:**
  1. Click "Upload Document"
  2. Select file, choose tax year
  3. Submit
  4. To download: Click the document, select "Download"
- **Pro tip:** Organize by tax year; use the year selector to filter documents
- **Formats accepted:** PDF, DOCX, XLS, XLSX, JPG, PNG (max 10 MB)

#### Secure Messaging
- **What:** Send encrypted messages to your accountant, track replies
- **Screenshots:** 
  - 09-portal-messages.png (inbox view with threads, unread badges)
  - 10-portal-thread.png (thread detail view, reply composer)
- **How to use:**
  1. Go to Messages → Inbox
  2. Click a thread to open conversation
  3. Type reply in the composer at the bottom
  4. Click Send
  5. To start new thread: Click "New Message"
- **Pro tip:** Unread badges show which threads have new replies from your accountant
- **Security note:** All messages are encrypted in transit and at rest

### Part 5: Admin Panel

#### Getting Started
- Login flow (same as clients, redirects to admin dashboard)
- Role-based access (ADMIN role required)
- What you can do

#### Client Management
- **What:** Searchable roster of all clients, manage client records
- **Screenshot:** 11-admin-clients.png
- **How to use:**
  1. View all clients in paginated table
  2. Search by name or email
  3. Click a client row to see Documents and Messages tabs
  4. Use "Create" button to add new client
  5. Use inline edit/delete for client records
- **Pro tip:** Use search to quickly locate a specific client
- **Common tasks:** Adding a new client, updating contact info, managing portal access

#### Per-Client Document Management
- **What:** Upload, download, and organize documents on behalf of any client
- **Screenshot:** 12-admin-client-documents.png
- **How to use:**
  1. Open client from roster
  2. Click Documents tab
  3. Select tax year from dropdown (10-year range available)
  4. Click "Upload Document" to add file on client's behalf
  5. Documents appear in client's portal automatically
  6. To delete: Click document, select "Delete"
- **Pro tip:** Use the year selector to manage documents across multiple tax years for the same client
- **Formats:** Same as client uploads (PDF, DOCX, XLS, XLSX, JPG, PNG, max 10 MB)
- **Security note:** You're uploading as the firm; clients see documents in their personal portal

#### Per-Client Messaging & Support
- **What:** Thread-based messaging with clients, track conversation status
- **Screenshot:** 13-admin-client-messages.png
- **Status indicators:**
  - Sky-blue badge = Client replied (unread)
  - Amber "Awaiting client" = You sent message, client hasn't opened it
  - Grey "Client read" = Client has read your message
- **How to use:**
  1. Open client from roster
  2. Click Messages tab
  3. View all message threads with this client
  4. Click a thread to open full conversation
  5. Type reply in composer
  6. Click Send
  7. To start new thread: Click "New Message"
- **Pro tip:** Status chips help you prioritize—see at a glance which clients need a response
- **Security note:** Conversations are encrypted and isolated to this client

### Part 6: Reference

#### Frequently Asked Questions
- Can I use the platform on mobile? (Yes, it's responsive)
- What file formats can I upload? (PDF, DOCX, XLS, XLSX, JPG, PNG)
- How long do you keep my documents? (Indefinitely, securely stored)
- Can I export all my documents at once? (Feature coming soon)
- What if I forget my password? (Sign in with Google OAuth2 — no password to forget)

#### Troubleshooting
- **Login not working:**
  - Ensure you're clicking "Continue with Google"
  - Check that your Google account email matches your firm contact info
  - Clear browser cookies and try again
- **Document upload fails:**
  - Check file size (max 10 MB)
  - Verify file format is supported
  - Try a different file if corruption suspected
- **Not seeing a message reply:**
  - Refresh the page
  - Check the Messages tab for the thread
  - Ask your accountant to resend if still missing

#### Security & Privacy
- **Data encryption:** All documents encrypted with AES-256 at rest; TLS in transit
- **Authentication:** Google OAuth2 prevents password theft
- **Access control:** Your data is visible only to you and your accountant (ADMIN role)
- **Compliance:** Platform follows best practices for financial data security
- **Report security issues:** Contact us with details at security@gwh-accounting.com

## Visual Design

- **Screenshots:** All 13 from README.md embedded with:
  - Figure numbers and captions
  - Arrow callouts highlighting key UI elements
  - Labels for interactive elements (buttons, inputs, etc.)
- **Layout:** Clean, readable, professional (matching Angular Material dark theme aesthetic)
- **Font & spacing:** Accessible size, clear hierarchy, consistent margins

## Content Tone

- Friendly, professional, non-technical
- Step-by-step instructions use numbered lists
- Pro tips and security notes use callout boxes
- Avoid jargon; explain "OAuth2" as "sign in with your Google account"

## Output Format

- **Source:** Markdown file (`docs/user-guide.md`)
- **Output:** PDF (`docs/user-guide.pdf`)
- **Tool:** Pandoc or browser-based renderer (HTML → PDF via headless Chrome)
- **Distribution:** Emailable PDF, embeddable in help center or app

## Success Criteria

- [x] All 13 screenshots embedded and captioned
- [x] Quick-start guides for both audiences (2-3 pages each)
- [x] Feature explanations balance "what it is" and "how to use it"
- [x] Professional layout with clear navigation (PDF bookmarks)
- [x] No technical jargon; accessible to non-technical users
- [x] Covers public site, client portal, and admin panel
- [x] Includes FAQ, troubleshooting, and security reference

## Notes

- The guide maintains the balance between feature explanation and practical instruction
- Both quick-start and detailed sections serve different user needs (quick reference vs. deep dive)
- Screenshot annotations will make the guide more scannable and useful
- PDF bookmarks enable easy navigation without re-reading cover material
