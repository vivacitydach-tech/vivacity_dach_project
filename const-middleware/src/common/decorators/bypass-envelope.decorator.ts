import { SetMetadata } from '@nestjs/common';

export const BYPASS_ENVELOPE = 'BYPASS_ENVELOPE';
export const BypassEnvelope = () => SetMetadata(BYPASS_ENVELOPE, true);
