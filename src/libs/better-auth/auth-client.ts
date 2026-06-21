import {
  adminClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  magicLinkClient,
  // UGS-MODIFY: UGS-005 phone number client plugin
  phoneNumberClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { type auth } from '@/auth';

export const {
  changeEmail,
  emailOtp,
  linkSocial,
  oauth2,
  accountInfo,
  listAccounts,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  unlinkAccount,
  useSession,
  // UGS-MODIFY: UGS-005 expose phoneNumber methods
  phoneNumber,
} = createAuthClient({
  plugins: [
    adminClient(),
    emailOTPClient(),
    inferAdditionalFields<typeof auth>(),
    genericOAuthClient(),
    // Always include magicLinkClient - server will reject if not enabled
    magicLinkClient(),
    // UGS-MODIFY: UGS-005 phone number client plugin
    phoneNumberClient(),
  ],
});
