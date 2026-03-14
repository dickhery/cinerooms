import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface VideoSubmission {
    id: bigint;
    viewDuration: string;
    status: string;
    title: string;
    thumbnailUrl: string;
    submitterPrincipal: Principal;
    createdAt: Time;
    description: string;
    paymentAddress: string;
    creatorName: string;
    category: string;
    price: string;
    videoUrl: string;
    denialReason: string;
}
export interface Room {
    id: bigint;
    viewDuration: string;
    title: string;
    thumbnailUrl: string;
    createdAt: Time;
    slug: string;
    description: string;
    creatorName: string;
    category: string;
    embedScript: string;
    price: string;
    videoUrl: string;
}
export interface HomepageScript {
    id: bigint;
    name: string;
    scriptContent: string;
    order: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bootstrapAdminIfNeeded(): Promise<boolean>;
    claimHardcodedAdmin(): Promise<boolean>;
    createRoom(title: string, slug: string, description: string, price: string, thumbnailUrl: string, videoUrl: string, embedScript: string, viewDuration: string, category: string, creatorName: string): Promise<Room>;
    deleteRoom(id: bigint): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPendingSubmissions(): Promise<Array<VideoSubmission>>;
    getRoomById(id: bigint): Promise<Room | null>;
    getRoomBySlug(slug: string): Promise<Room | null>;
    getRooms(): Promise<Array<Room>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSubmissions(): Promise<Array<VideoSubmission>>;
    hasAdmin(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    resetAdmin(): Promise<void>;
    reviewSubmission(id: bigint, approve: boolean, embedScript: string, denialReason: string): Promise<VideoSubmission>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitVideo(title: string, description: string, videoUrl: string, thumbnailUrl: string, paymentAddress: string, price: string, category: string, viewDuration: string, creatorName: string): Promise<VideoSubmission>;
    updateRoom(id: bigint, title: string, slug: string, description: string, price: string, thumbnailUrl: string, videoUrl: string, embedScript: string, viewDuration: string, category: string, creatorName: string): Promise<Room>;
    getHomepageScripts(): Promise<Array<HomepageScript>>;
    addHomepageScript(name: string, scriptContent: string): Promise<HomepageScript>;
    updateHomepageScript(id: bigint, name: string, scriptContent: string): Promise<HomepageScript>;
    removeHomepageScript(id: bigint): Promise<boolean>;
    reorderHomepageScripts(ids: Array<bigint>): Promise<void>;
}
