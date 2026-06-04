/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Layout preview={`Reset your password for ${siteName}`}>
    <Heading style={styles.h1}>Reset your password</Heading>
    <Text style={styles.text}>
      We received a request to reset your {siteName} password. Click the button below to choose a new one.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>Reset password</Button>
    <Text style={styles.hint}>
      If you didn't request a password reset, you can safely ignore this email — your password won't change.
    </Text>
  </Layout>
)

export default RecoveryEmail
