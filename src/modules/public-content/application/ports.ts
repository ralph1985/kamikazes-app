export type PublicSection = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export type PublicSocialLink = {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
};

export interface PublicContentReader {
  listSections(input: { visibleOnly: boolean }): Promise<PublicSection[]>;
  listSocialLinks(input: { activeOnly: boolean }): Promise<PublicSocialLink[]>;
}
