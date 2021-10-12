import { ArticleHelper, Settings } from ".";
import { SETTING_TAXONOMY_CONTENT_TYPES, SETTING_TEMPLATES_PREFIX } from "../constants";
import { ContentType as IContentType } from '../models';
import { Uri, workspace, window } from 'vscode'; 
import { Folders } from "../commands/Folders";
import { Questions } from "./Questions";
import { format } from "date-fns";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Notifications } from "./Notifications";
import { DEFAULT_CONTENT_TYPE_NAME } from "../constants/ContentType";


export class ContentType {

  /**
   * Create content based on content types
   * @returns 
   */
  public static async createContent() {
    const selectedContentType = await Questions.SelectContentType();
    if (!selectedContentType) {
      return;
    }

    const selectedFolder = await Questions.SelectContentFolder();
    if (!selectedFolder) {
      return;
    }

    const contentTypes = ContentType.getAll();
    const folders = Folders.get();

    const location = folders.find(f => f.title === selectedFolder);
    if (contentTypes && location) {
      const folderPath = Folders.getFolderPath(Uri.file(location.path));
      const contentType = contentTypes.find(ct => ct.name === selectedContentType);
      if (folderPath && contentType) {
        ContentType.create(contentType, folderPath);
      }
    }
  }

  /**
   * Retrieve all content types
   * @returns 
   */
  public static getAll() {
    return Settings.get<IContentType[]>(SETTING_TAXONOMY_CONTENT_TYPES);
  }

  private static async create(contentType: IContentType, folderPath: string) {

    const titleValue = await Questions.ContentTitle();
    if (!titleValue) {
      return;
    }

    let newFilePath: string | undefined = ArticleHelper.createContent(contentType, folderPath, titleValue);
    if (!newFilePath) {
      return;
    }

    let data: any = {};

    for (const field of contentType.fields) {
      if (field.name === "title") {
        data[field.name] = titleValue;
      } else {
        data[field.name] = null;
      }
    }

    data = ArticleHelper.updateDates(Object.assign({}, data));

    if (contentType.name !== DEFAULT_CONTENT_TYPE_NAME) {
      data['type'] = contentType.name;
    }

    const content = ArticleHelper.stringifyFrontMatter(``, data);

    writeFileSync(newFilePath, content, { encoding: "utf8" });

    const txtDoc = await workspace.openTextDocument(Uri.parse(newFilePath));
    if (txtDoc) {
      window.showTextDocument(txtDoc);
    }

    Notifications.info(`Your new content has been created.`);
  }
}