/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BRAND, styles } from './_brand.ts'

interface Props {
  children: React.ReactNode
  preview: string
}

export const Layout = ({ children, preview }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={BRAND.logoUrl} alt="FTrack" style={styles.logo} />
        </Section>
        <Section style={styles.content}>{children}</Section>
        <Section>
          <Text style={styles.footer}>
            FTrack — UK F-Gas compliance for refrigeration and AC engineers.
            <br />
            <Link href={BRAND.siteUrl} style={{ color: BRAND.muted }}>
              ftrack.uk
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
