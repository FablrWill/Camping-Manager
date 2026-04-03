import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest & {
  share_target?: {
    action: string
    method: string
    enctype: string
    params: {
      title?: string
      text?: string
      url?: string
      files?: Array<{ name: string; accept: string[] }>
    }
  }
} {
  return {
    name: 'Outland OS',
    short_name: 'Outland',
    description: 'Personal camping second brain',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0a09',
    theme_color: '#d97706',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/api/intake',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'text',
        text: 'text',
        url: 'url',
        files: [{ name: 'file', accept: ['image/*'] }],
      },
    },
  }
}
