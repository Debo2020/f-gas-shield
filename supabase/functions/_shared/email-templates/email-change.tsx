/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Layout preview={`Confirm your email change for ${siteName}`}>
    <Heading style={styles.h1}>Confirm your email change</Heading>
    <Text style={styles.text}>
      You requested to change the email on your {siteName} account from{' '}
      <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link> to{' '}
      <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>Confirm email change</Button>
    <Text style={styles.hint}>
      If you didn't request this change, please secure your account immediately.
    </Text>
  </Layout>
)

export default EmailChangeEmail
