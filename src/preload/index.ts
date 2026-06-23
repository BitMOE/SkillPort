import { contextBridge, ipcRenderer } from 'electron'
import type { SkillPortApi } from '../shared/api'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

const api: SkillPortApi = {
  catalog: {
    search: (params) => invoke('catalog:search', params),
    getDetail: (id) => invoke('catalog:get-detail', id),
    validate: (id) => invoke('catalog:validate', id)
  },
  sources: {
    list: () => invoke('sources:list'),
    sync: (sourceId) => invoke('sources:sync', sourceId),
    syncAll: () => invoke('sources:sync-all'),
    testConnection: (sourceId) => invoke('sources:test-connection', sourceId)
  },
  scan: {
    start: (params) => invoke('scan:start', params),
    importCandidate: (params) => invoke('scan:import-candidate', params)
  },
  install: {
    createPlan: (params) => invoke('install:create-plan', params),
    execute: (planId) => invoke('install:execute', planId)
  },
  rules: {
    list: () => invoke('rules:list'),
    previewApply: (params) => invoke('rules:preview-apply', params),
    applyPackage: (params) => invoke('rules:apply-package', params)
  },
  platforms: {
    list: () => invoke('platforms:list'),
    update: (platformKey, config) => invoke('platforms:update', platformKey, config),
    reset: (platformKey) => invoke('platforms:reset', platformKey)
  },
  jobs: {
    list: () => invoke('jobs:list'),
    retry: (jobId) => invoke('jobs:retry', jobId)
  },
  audit: {
    list: () => invoke('audit:list')
  },
  dashboard: {
    summary: () => invoke('dashboard:summary')
  }
}

contextBridge.exposeInMainWorld('skillport', api)
