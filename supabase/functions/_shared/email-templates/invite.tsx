/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Layout preview={`You've been invited to join ${siteName}`}>
    <Heading style={styles.h1}>You've been invited to {siteName}</Heading>
    <Text style={styles.text}>
      Accept the invitation below to set up your account and start tracking F-Gas compliance with your team.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>Accept invitation</Button>
    <Text style={styles.hint}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </Layout>
)

export default InviteEmail
