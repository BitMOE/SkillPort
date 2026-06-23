import type { SkillPortApi } from '../../shared/api'

declare global {
  interface Window {
    skillport: SkillPortApi
  }
}

export {}
