export interface LabelColor {
  backgroundColor: string
  textColor: string
}

export interface LabelDefinition {
  name: string
  description: string
  color: LabelColor
  keywords?: string[]
}

export interface AppliedLabel {
  name: string
  providerId: string
}
