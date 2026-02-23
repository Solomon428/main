export class BackupApproverAssigner {
  static assignBackup(availableApprovers: any[], primary: any, routingId: string): string | null {
    const candidates = availableApprovers.filter((a: any) => a.id !== primary?.id);
    return candidates.length > 0 ? candidates[0].id : null;
  }
}
