import { query } from '../pg.js';
import { generateSecureId } from '../db.js';

export interface NotificationTemplateRecord {
  id: string;
  eventType: string;
  name: string;
  nameBn: string;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  isActive: boolean;
  availableVariables: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export class NotificationService {
  /**
   * Safely replaces mustache style variables {{var_name}} with context values.
   * Prevents arbitrary code execution and handles missing variables cleanly.
   */
  public static renderTemplate(templateStr: string, context: Record<string, any> = {}): string {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      const val = context[key];
      if (val !== undefined && val !== null) {
        return String(val);
      }
      return '';
    });
  }

  /**
   * Fetches an event template by eventType from PostgreSQL.
   */
  public static async getTemplate(eventType: string): Promise<NotificationTemplateRecord | null> {
    try {
      const res = await query(
        `SELECT id, event_type as "eventType", name, name_bn as "nameBn", 
                title, title_bn as "titleBn", message, message_bn as "messageBn", 
                is_active as "isActive", available_variables as "availableVariables", 
                metadata, created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
         FROM notification_templates WHERE event_type = $1`,
        [eventType]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        ...row,
        availableVariables: typeof row.availableVariables === 'string' 
          ? JSON.parse(row.availableVariables) 
          : (row.availableVariables || [])
      };
    } catch (err) {
      console.error('[NotificationService] getTemplate error:', err);
      return null;
    }
  }

  /**
   * Fetches all notification templates.
   */
  public static async getAllTemplates(): Promise<NotificationTemplateRecord[]> {
    try {
      const res = await query(
        `SELECT id, event_type as "eventType", name, name_bn as "nameBn", 
                title, title_bn as "titleBn", message, message_bn as "messageBn", 
                is_active as "isActive", available_variables as "availableVariables", 
                metadata, created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
         FROM notification_templates ORDER BY event_type ASC`
      );
      return res.rows.map(row => ({
        ...row,
        availableVariables: typeof row.availableVariables === 'string' 
          ? JSON.parse(row.availableVariables) 
          : (row.availableVariables || [])
      }));
    } catch (err) {
      console.error('[NotificationService] getAllTemplates error:', err);
      return [];
    }
  }

  /**
   * Updates an existing notification template.
   */
  public static async updateTemplate(
    eventType: string, 
    data: { title?: string; titleBn?: string; message?: string; messageBn?: string; isActive?: boolean },
    adminId?: string
  ): Promise<NotificationTemplateRecord | null> {
    try {
      const existing = await this.getTemplate(eventType);
      if (!existing) return null;

      const title = data.title !== undefined ? data.title.trim() : existing.title;
      const titleBn = data.titleBn !== undefined ? data.titleBn.trim() : (data.title !== undefined ? data.title.trim() : existing.titleBn);
      const message = data.message !== undefined ? data.message.trim() : existing.message;
      const messageBn = data.messageBn !== undefined ? data.messageBn.trim() : (data.message !== undefined ? data.message.trim() : existing.messageBn);
      const isActive = data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive;

      await query(
        `UPDATE notification_templates 
         SET title = $1, title_bn = $2, message = $3, message_bn = $4, is_active = $5, updated_at = NOW()
         WHERE event_type = $6`,
        [title, titleBn, message, messageBn, isActive, eventType]
      );

      return await this.getTemplate(eventType);
    } catch (err) {
      console.error('[NotificationService] updateTemplate error:', err);
      return null;
    }
  }

  /**
   * Main entry point for sending automatic notifications using Admin-configured templates.
   * Resolves dynamic variables, checks active status, prevents duplicate notifications, 
   * and stores the notification in PostgreSQL.
   */
  public static async sendFromTemplate(
    eventType: string,
    recipientUserId: string | null | undefined,
    context: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (!recipientUserId) {
      console.log(`[NotificationService] No recipientUserId provided for event ${eventType}, skipping notification.`);
      return false;
    }

    try {
      // 1. Fetch template from PostgreSQL
      const tpl = await this.getTemplate(eventType);
      if (!tpl) {
        console.warn(`[NotificationService] Template for event ${eventType} not found.`);
        return false;
      }

      // 2. Check template enable/disable toggle
      if (!tpl.isActive) {
        console.log(`[NotificationService] Template for event ${eventType} is disabled by Admin. Notification skipped.`);
        return false;
      }

      // 3. Resolve user details if user_name is not provided in context
      const fullContext = { ...context };
      if (!fullContext.user_name || fullContext.user_name === '') {
        try {
          const userRes = await query('SELECT full_name FROM users WHERE id = $1', [recipientUserId]);
          if (userRes.rows.length > 0 && userRes.rows[0].full_name) {
            fullContext.user_name = userRes.rows[0].full_name;
          } else {
            fullContext.user_name = 'প্রিয় ব্যবহারকারী';
          }
        } catch {
          fullContext.user_name = 'প্রিয় ব্যবহারকারী';
        }
      }

      if (!fullContext.date) {
        fullContext.date = new Date().toLocaleDateString('bn-BD');
      }

      // 4. Persistent DB Idempotency & Duplicate Guard: Prevent duplicate notifications across retries / multiple instances
      const idempotencyKey = metadata.idempotencyKey || metadata.mosqueId || metadata.application_id || metadata.tokenId || metadata.redemptionId || null;
      if (idempotencyKey) {
        const dupCheck = await query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND type = $2 AND (
             metadata->>'idempotencyKey' = $3 OR 
             metadata->>'mosqueId' = $3 OR 
             metadata->>'application_id' = $3 OR 
             metadata->>'tokenId' = $3 OR 
             metadata->>'redemptionId' = $3
           )`,
          [recipientUserId, eventType, String(idempotencyKey)]
        );
        if (dupCheck.rows.length > 0) {
          console.warn(`[NotificationService] Persistent duplicate notification suppressed for event ${eventType}, key: ${idempotencyKey}`);
          return false;
        }
      } else {
        // Fallback for non-entity notifications: 10-second window check for identical user/event/title
        const timeWindowCheck = await query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND type = $2 AND title_bn = $3 
             AND created_at > NOW() - INTERVAL '10 seconds'`,
          [recipientUserId, eventType, tpl.titleBn]
        );
        if (timeWindowCheck.rows.length > 0) {
          console.warn(`[NotificationService] Time-window duplicate notification suppressed for event ${eventType}`);
          return false;
        }
      }

      // 5. Render dynamic titles and messages
      const renderedTitle = this.renderTemplate(tpl.title, fullContext);
      const renderedTitleBn = this.renderTemplate(tpl.titleBn, fullContext);
      const renderedMessage = this.renderTemplate(tpl.message, fullContext);
      const renderedMessageBn = this.renderTemplate(tpl.messageBn, fullContext);

      const notifId = generateSecureId('NOTIF');
      const finalMetadata = {
        ...metadata,
        eventType,
        templateId: tpl.id,
        idempotencyKey: idempotencyKey || undefined
      };

      // 6. Insert into persistent PostgreSQL notifications table
      await query(
        `INSERT INTO notifications (id, user_id, type, title, title_bn, message, message_bn, read, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, NOW())`,
        [
          notifId,
          recipientUserId,
          eventType,
          renderedTitle,
          renderedTitleBn,
          renderedMessage,
          renderedMessageBn,
          JSON.stringify(finalMetadata)
        ]
      );

      console.log(`[NotificationService] Notification sent successfully to user ${recipientUserId} for event ${eventType}`);
      return true;
    } catch (err) {
      console.error(`[NotificationService] Failed to send notification for event ${eventType}:`, err);
      // Return false safely without failing parent business action
      return false;
    }
  }
}
