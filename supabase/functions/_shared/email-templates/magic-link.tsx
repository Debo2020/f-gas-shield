/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Layout preview={`Your sign-in link for ${siteName}`}>
    <Heading style={styles.h1}>Sign in to {siteName}</Heading>
    <Text style={styles.text}>
      Click the button below to securely sign in. This link expires shortly and can only be used once.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>Sign in</Button>
    <Text style={styles.hint}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </Layout>
)

export default MagicLinkEmail
