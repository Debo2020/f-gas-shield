/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { styles } from './_brand.ts'
import { Layout } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Layout preview="Your FTrack verification code">
    <Heading style={styles.h1}>Confirm it's you</Heading>
    <Text style={styles.text}>Enter the code below to confirm your identity:</Text>
    <Text style={styles.code}>{token}</Text>
    <Text style={styles.hint}>
      This code expires shortly. If you didn't request it, you can safely ignore this email.
    </Text>
  </Layout>
)

export default ReauthenticationEmail
