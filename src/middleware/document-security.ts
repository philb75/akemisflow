import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export interface DocumentAccessContext {
  user: {
    id: string
    role: UserRole
    companyId?: string | null
  }
  document: {
    id: string
    userId: string
    contactId?: string | null
    contractorId?: string | null
    invoiceId?: string | null
    isActive: boolean
    deletedAt?: Date | null
  }
}

/**
 * Check if a user has access to a specific document
 */
export async function checkDocumentAccess(
  userId: string,
  documentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    })

    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Get document details
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        contactId: true,
        contractorId: true,
        invoiceId: true,
        isActive: true,
        deletedAt: true,
        contact: {
          select: { id: true, name: true }
        },
        contractor: {
          select: { id: true, firstName: true, lastName: true }
        },
        invoice: {
          select: { id: true, invoiceNumber: true, clientContactId: true }
        }
      }
    })

    if (!document) {
      return { allowed: false, reason: 'Document not found' }
    }

    // Check if document is active
    if (!document.isActive || document.deletedAt) {
      return { allowed: false, reason: 'Document is not active' }
    }

    // Administrators can access all documents
    if (user.role === 'ADMINISTRATOR') {
      return { allowed: true }
    }

    // Document owner can access their own documents
    if (document.userId === user.id) {
      return { allowed: true }
    }

    // Check if user belongs to the same company as the document's entity
    if (user.companyId) {
      // Check contact association
      if (document.contactId === user.companyId) {
        return { allowed: true }
      }

      // Check invoice association
      if (document.invoice && document.invoice.clientContactId === user.companyId) {
        return { allowed: true }
      }
    }

    // Auditors can view documents but not modify
    if (user.role === 'AUDITOR') {
      return { allowed: true }
    }

    return { allowed: false, reason: 'Access denied' }
  } catch (error) {
    console.error('Document access check error:', error)
    return { allowed: false, reason: 'Access check failed' }
  }
}

/**
 * Check if a user can upload documents for a specific entity
 */
export async function checkUploadPermission(
  userId: string,
  entityType: 'entity' | 'contractor' | 'invoice' | 'supplier',
  entityId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    })

    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Administrators can upload for any entity
    if (user.role === 'ADMINISTRATOR') {
      return { allowed: true }
    }

    // Check entity-specific permissions
    switch (entityType) {
      case 'entity':
        const contact = await prisma.contact.findUnique({
          where: { id: entityId },
          select: { id: true }
        })
        
        if (!contact) {
          return { allowed: false, reason: 'Entity not found' }
        }

        // Users can upload documents for their own company
        if (user.companyId === entityId) {
          return { allowed: true }
        }
        break

      case 'contractor':
      case 'supplier':
        const contractor = await prisma.contractor.findUnique({
          where: { id: entityId },
          select: { id: true, email: true }
        })
        
        if (!contractor) {
          return { allowed: false, reason: 'Contractor not found' }
        }

        // For now, only admins can upload for contractors
        // In the future, contractors could have their own accounts
        break

      case 'invoice':
        const invoice = await prisma.invoice.findUnique({
          where: { id: entityId },
          select: { id: true, clientContactId: true }
        })
        
        if (!invoice) {
          return { allowed: false, reason: 'Invoice not found' }
        }

        // Users can upload documents for invoices of their company
        if (user.companyId === invoice.clientContactId) {
          return { allowed: true }
        }
        break
    }

    return { allowed: false, reason: 'Upload permission denied' }
  } catch (error) {
    console.error('Upload permission check error:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
}

/**
 * Check if a user can delete a document
 */
export async function checkDeletePermission(
  userId: string,
  documentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Administrators can delete any document
    if (user.role === 'ADMINISTRATOR') {
      return { allowed: true }
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, userId: true }
    })

    if (!document) {
      return { allowed: false, reason: 'Document not found' }
    }

    // Document owner can delete their own documents
    if (document.userId === user.id) {
      return { allowed: true }
    }

    return { allowed: false, reason: 'Delete permission denied' }
  } catch (error) {
    console.error('Delete permission check error:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
}

/**
 * Check if a user can verify a document
 */
export async function checkVerifyPermission(
  userId: string,
  documentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Only administrators and auditors can verify documents
    if (user.role === 'ADMINISTRATOR' || user.role === 'AUDITOR') {
      return { allowed: true }
    }

    return { allowed: false, reason: 'Only administrators and auditors can verify documents' }
  } catch (error) {
    console.error('Verify permission check error:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
}