import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  timestamp: number
}

class NotificationManager {
  private notifications = ref<Notification[]>([])
  private idCounter = 0

  show(
    type: NotificationType,
    title: string,
    message: string,
    duration: number = 5000
  ): string {
    const id = `notification-${++this.idCounter}`
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    }

    this.notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, duration)
    }

    return id
  }

  remove(id: string): void {
    const index = this.notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      this.notifications.value.splice(index, 1)
    }
  }

  clear(): void {
    this.notifications.value = []
  }

  success(title: string, message: string, duration?: number): string {
    return this.show('success', title, message, duration)
  }

  error(title: string, message: string, duration?: number): string {
    return this.show('error', title, message, duration || 8000) // 错误信息显示更久
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show('warning', title, message, duration)
  }

  info(title: string, message: string, duration?: number): string {
    return this.show('info', title, message, duration)
  }

  get list() {
    return this.notifications.value
  }
}

export const notificationManager = new NotificationManager()

// 全局错误处理函数
export const handleError = (error: any, context: string = '操作'): void => {
  console.error(`${context}失败:`, error)
  
  let message = '未知错误'
  
  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  } else if (error?.message) {
    message = error.message
  }

  notificationManager.error(
    `${context}失败`,
    message
  )
}