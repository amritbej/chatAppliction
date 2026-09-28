export interface User {
  _id: string;
  username: string;
  displayName?: string;
  email: string;
  avatar?: string;
  bio?: string;
  authProvider?: "local" | "google";
  isEmailVerified: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  token?: string;
}

export interface Room {
  _id: string;
  name?: string;
  isGroup: boolean;
  members: User[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  user: User | string;
  emoji: string;
}

export interface PaymentDetails {
  transactionId: string;
  amount: number; // Minor units (paise)
  currency: string;
  status: "created" | "pending" | "processing" | "success" | "failed" | "cancelled" | "refunded";
  note?: string;
}

export interface Message {
  _id: string;
  room: string;
  sender: User;
  content: string;
  type: "text" | "image" | "file" | "payment";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  replyTo?: Message;
  mentions?: User[];
  payment?: PaymentDetails;
  reactions?: MessageReaction[];
  isEdited?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
  readBy?: string[];
  deliveredTo?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  provider: "razorpay" | "mock" | "stripe";
  providerOrderId?: string;
  providerPaymentId?: string;
  sender: User;
  recipient: User;
  amount: number; // Minor units (paise)
  currency: string;
  note?: string;
  status: "created" | "pending" | "processing" | "success" | "failed" | "cancelled" | "refunded";
  paymentMethod?: string;
  chatRoom?: string;
  relatedMessage?: string;
  failureReason?: string;
  refundStatus?: "none" | "requested" | "partial" | "full";
  refundAmount?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  user: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface CallSession {
  roomId?: string;
  userId?: string;
  username: string;
  callType: "audio" | "video";
  status: "idle" | "ringing" | "calling" | "connected" | "ended";
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}
