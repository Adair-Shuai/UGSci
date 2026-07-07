import {
  adminClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  magicLinkClient,
  phoneNumberClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { type auth } from '@/auth';

export const {
  changeEmail,
  linkSocial,
  oauth2,
  accountInfo,
  listAccounts,
  // UGS-MODIFY: email OTP & phone OTP client plugins
  emailOtp,
  phoneNumber,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  unlinkAccount,
  useSession,
} = createAuthClient({
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
    genericOAuthClient(),
    // Always include magicLinkClient - server will reject if not enabled
    magicLinkClient(),
    // UGS-MODIFY: email OTP & phone OTP client plugins
    emailOTPClient(),
    phoneNumberClient(),
  ],
});
