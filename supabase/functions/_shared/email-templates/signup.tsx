/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <Layout preview={`Confirm your email for ${siteName}`}>
    <Heading style={styles.h1}>Confirm your email</Heading>
    <Text style={styles.text}>
      Welcome to <strong>{siteName}</strong>. Please confirm{' '}
      <Link href={`mailto:${recipient}`} style={styles.link}>{recipient}</Link>{' '}
      to activate your account and start managing your F-Gas compliance.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>Verify email</Button>
    <Text style={styles.hint}>
      If you didn't sign up for FTrack, you can safely ignore this email.
    </Text>
  </Layout>
)

export default SignupEmail
