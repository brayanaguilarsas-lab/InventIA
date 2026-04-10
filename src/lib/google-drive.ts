import { google } from 'googleapis';
import { Readable } from 'stream';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Drive credentials not configured');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

/**
 * Create a folder for an asset inside the root inventory folder.
 * Returns the folder URL.
 */
export async function createAssetFolder(assetCode: string, assetName: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');

  const drive = getDrive();

  const folderName = `${assetCode}-${assetName.replace(/[/\\]/g, '_')}`;

  const { data } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id, webViewLink',
  });

  return data.webViewLink ?? `https://drive.google.com/drive/folders/${data.id}`;
}

/**
 * Upload a file to an asset's Drive folder.
 */
export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<string> {
  const drive = getDrive();

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, webViewLink',
  });

  return data.webViewLink ?? `https://drive.google.com/file/d/${data.id}`;
}

/**
 * Upload a PDF acta to the asset's Drive folder.
 * Extracts folder ID from the drive_folder_url.
 */
export async function uploadActaToDrive(
  driveFolderUrl: string,
  actaName: string,
  pdfBytes: Uint8Array
): Promise<string> {
  // Extract folder ID from URL
  const match = driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Drive folder URL');

  const folderId = match[1];
  return uploadFileToDrive(
    folderId,
    actaName,
    'application/pdf',
    Buffer.from(pdfBytes)
  );
}

/**
 * Upload original files (photo, invoice, spec sheet) to asset folder.
 */
export async function uploadOriginalFiles(
  driveFolderUrl: string,
  files: Array<{ name: string; type: string; buffer: Buffer }>
): Promise<string[]> {
  const match = driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Drive folder URL');

  const folderId = match[1];
  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadFileToDrive(folderId, file.name, file.type, file.buffer);
    urls.push(url);
  }

  return urls;
}
