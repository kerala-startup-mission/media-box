/**
 * Runs Code.gs in Node against stubbed Apps Script services, so the
 * authorisation rules and the sheet column contract can be tested without
 * deploying. Not shipped to the Apps Script project.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const CLIENT_ID = "test-client.apps.googleusercontent.com";

export function makeSandbox({ users = [], rows = [], tokenInfo = null, ownerEmail = "owner@startupmission.in" } = {}) {
  const sheets = new Map();

  function makeSheet(name, seedRows) {
    const data = seedRows ? seedRows.map((r) => [...r]) : [];
    const sheet = {
      name,
      data,
      getLastRow: () => data.length,
      appendRow: (row) => data.push([...row]),
      insertSheet: () => sheet,
      getRange(row, col, numRows = 1, numCols = 1) {
        return {
          getValues() {
            const out = [];
            for (let r = 0; r < numRows; r += 1) {
              const source = data[row - 1 + r] || [];
              out.push(Array.from({ length: numCols }, (_, c) => source[col - 1 + c] ?? ""));
            }
            return out;
          },
          setValues(values) {
            values.forEach((line, r) => {
              const target = (data[row - 1 + r] ||= []);
              line.forEach((v, c) => { target[col - 1 + c] = v; });
            });
          },
          setFontWeight: () => sheet
        };
      },
      getDataRange() { return sheet.getRange(1, 1, data.length, 80); }
    };
    return sheet;
  }

  sheets.set("Media Requests", makeSheet("Media Requests", rows));
  sheets.set("Users", makeSheet("Users", users));

  const fetchLog = [];
  const sandbox = {
    console,
    fetchLog,
    sheetsMap: sheets,
    SpreadsheetApp: {
      openById: () => ({
        getUrl: () => "https://docs.google.com/spreadsheets/d/test",
        getSheetByName: (n) => sheets.get(n) || null,
        insertSheet: (n) => { const s = makeSheet(n); sheets.set(n, s); return s; }
      })
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      computeDigest: (_a, text) => Array.from(String(text)).map((c) => c.charCodeAt(0) % 256),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString("base64url").slice(0, 40)
    },
    UrlFetchApp: {
      fetch: (url) => {
        fetchLog.push(url);
        if (!tokenInfo) return { getResponseCode: () => 400, getContentText: () => "{}" };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(tokenInfo) };
      }
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => ownerEmail }) },
    MailApp: { sendEmail: () => {} },
    DriveApp: { getFolderById: () => ({ createFile: () => ({ getUrl: () => "", getId: () => "" }) }) },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: (text) => ({ setMimeType: () => ({ text, json: JSON.parse(text) }) })
    }
  };

  vm.createContext(sandbox);
  let src = readFileSync(new URL("../Code.gs", import.meta.url), "utf8");
  src = src.replace('"PASTE_YOUR_OAUTH_CLIENT_ID_HERE.apps.googleusercontent.com"', JSON.stringify(CLIENT_ID));
  // PDF creation needs Drive; disable it for these tests.
  src = src.replace('pdfFolderId: "19FH8KMbKq4AMqEwzhkMFSRqo0YAA-jWV"', 'pdfFolderId: "PASTE_DISABLED"');
  vm.runInContext(src, sandbox);
  return sandbox;
}

export function post(sandbox, body) {
  const out = sandbox.doPost({ postData: { contents: JSON.stringify(body) } });
  return out.json;
}

export function validToken(overrides = {}) {
  return {
    aud: CLIENT_ID,
    iss: "https://accounts.google.com",
    exp: String(Math.floor(Date.now() / 1000) + 3600),
    email: "staff@startupmission.in",
    email_verified: "true",
    name: "Staff Member",
    ...overrides
  };
}
