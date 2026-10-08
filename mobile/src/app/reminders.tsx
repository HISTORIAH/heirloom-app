import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { InkToast } from "@/components/InkToast";
import { AlertPreview } from "@/components/reminders/AlertPreview";
import { ContactFields } from "@/components/reminders/ContactFields";
import { HeirProfileFields } from "@/components/reminders/HeirProfileFields";
import { ReminderTimeline } from "@/components/reminders/ReminderTimeline";
import { ReviewSheet } from "@/components/reminders/ReviewSheet";
import { VerifySheet } from "@/components/reminders/VerifySheet";
import {
  ActionRow,
  Badge,
  Cap,
  CheckBox,
  Display,
  IconButton,
  Lede,
  PillButton,
  PrimaryButton,
} from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { TOAST_MS } from "@/constants/ui";
import {
  useEstates,
  useReminders,
  useResendVerification,
  useSaveReminders,
  useSession,
  useVerifyEmail,
} from "@/hooks";
import { estateName, shortAddress } from "@/lib";
import {
  channelLabel,
  cleanProfile,
  contactState,
  draftBlank,
  draftProblem,
  freeChannels,
  genericAlert,
  reminderError,
  sameEnum,
  verifyError,
} from "@/lib/reminders";
import { colors, floatShadow, font, space } from "@/theme";
import type {
  AddRecipientRequest,
  ContactDraft,
  ContactState,
  HeirProfile,
  PendingVerification,
  RecipientResponse,
  ReminderChannel,
  ReminderRole,
} from "@/types/reminders";

const EMPTY_PROFILE: HeirProfile = { heirName: null, ownerName: null, note: null };
const ROLES: ReminderRole[] = ["checkInSigner", "heir"];
/** Step badge in each section header. */
const STEP = 28;

function blankDraft(channel: ReminderChannel = "telegram"): ContactDraft {
  return { channel, value: "", again: "" };
}

function sameProfile(a: HeirProfile, b: HeirProfile): boolean {
  const x = cleanProfile(a);
  const y = cleanProfile(b);
  return x.heirName === y.heirName && x.ownerName === y.ownerName && x.note === y.note;
}

function channelOf(recipient: RecipientResponse): ReminderChannel {
  return sameEnum(recipient.channel, "email") ? "email" : "telegram";
}

/** Heir emails get no code: the backend trusts them once the owner's own contact is verified. */
function statusLine(contact: ContactState, role: ReminderRole): string {
  if (contact.kind === "none") return "Not set";
  if (contact.kind === "connected") return "Connected";
  if (channelOf(contact.recipient) === "telegram") return "Waiting for Telegram";
  return role === "heir"
    ? "Starts once your contact is verified"
    : "Not verified · check your inbox";
}

/** One numbered card on the form. The badge turns lime with a check once the step is done. */
function Section({
  step,
  title,
  sub,
  done,
  delay,
  children,
}: {
  step: number;
  title: string;
  sub: string;
  done?: boolean;
  delay: number;
  children: ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify().damping(18)}
      layout={LinearTransition.duration(240)}
      style={{
        gap: 16,
        padding: space.tile,
        borderRadius: space.radiusHero,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: STEP,
            height: STEP,
            borderRadius: STEP / 2,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: done ? colors.lime : colors.ink,
          }}
        >
          {done ? (
            <Icon name="check" size={14} weight={3.2} />
          ) : (
            <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.bg }}>{step}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink }}>{title}</Text>
          <Text
            style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}
          >
            {sub}
          </Text>
        </View>
      </View>
      {children}
    </Animated.View>
  );
}

/** The disabled "copy to every estate" switch. Owner contacts only; heir contacts never copy. */
function AllEstatesToggle() {
  return (
    <View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false, disabled: true }}
      accessibilityLabel="Use my contacts on all estates. Coming soon."
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusBtn,
        backgroundColor: colors.paper,
        opacity: 0.45,
      }}
    >
      <CheckBox checked={false} />
      <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink }}>
        Use my contacts on all estates
      </Text>
      <Badge label="Soon" />
    </View>
  );
}

/** No session yet: the reminders are private until the owner signs a message. */
function Locked({ signing, onSignIn }: { signing: boolean; onSignIn: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(420)}
      style={{
        alignItems: "center",
        gap: 14,
        paddingVertical: 28,
        paddingHorizontal: space.tile,
        borderRadius: space.radiusHero,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.yellow,
        }}
      >
        <Icon name="lock" size={30} weight={2.2} />
      </View>
      <Display size={26}>Private to you</Display>
      <Text
        style={{
          textAlign: "center",
          fontFamily: font.regular,
          fontSize: 15,
          lineHeight: 22,
          color: colors.mute,
        }}
      >
        Sign a message to see and change this estate’s reminders. It’s free and moves nothing.
      </Text>
      <PrimaryButton
        icon="unlock"
        label={signing ? "Check your wallet…" : "Sign in"}
        disabled={signing}
        onPress={onSignIn}
      />
    </Animated.View>
  );
}

/**
 * One estate's reminders on one form: where to remind the owner, where to tell the heir, how the
 * heir alert reads, and when it all goes out. Contacts are typed in place and everything saves
 * with one button; new contacts get one read-back before they're sent, since they can't be
 * edited yet. Verifications then play one after another.
 */
export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { estate = "" } = useLocalSearchParams<{ estate: string }>();
  const { rows } = useEstates("authority");
  const [queue, setQueue] = useState<PendingVerification[]>([]);
  const [queued, setQueued] = useState(0);
  const pending = queue[0];
  const reminders = useReminders(estate, { poll: pending !== undefined });
  const session = useSession();
  const save = useSaveReminders(estate);
  const resend = useResendVerification(estate);
  const verifyEmail = useVerifyEmail(estate);

  const [drafts, setDrafts] = useState<Record<ReminderRole, ContactDraft>>({
    checkInSigner: blankDraft(),
    heir: blankDraft(),
  });
  // "Add email as well" on a role that already has a contact.
  const [adding, setAdding] = useState<Record<ReminderRole, boolean>>({
    checkInSigner: false,
    heir: false,
  });
  const [profileDraft, setProfileDraft] = useState<HeirProfile | undefined>(undefined);
  const [reviewing, setReviewing] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const row = rows.find((item) => String(item.address) === estate);
  const hasOthers = rows.some((item) => String(item.address) !== estate);
  const name = row !== undefined ? estateName(row) : shortAddress(estate);
  const savedProfile = reminders.heir ?? EMPTY_PROFILE;
  const profile = profileDraft ?? savedProfile;
  const heirName = profile.heirName?.trim();
  const heirLabel = heirName
    ? heirName
    : row !== undefined
      ? `Heir ${shortAddress(String(row.data.heir))}`
      : "your heir";
  const hasSubscription = reminders.recipients.length > 0;

  const contactsOf = (role: ReminderRole) =>
    reminders.recipients.filter((r) => sameEnum(r.role, role)).map((r) => contactState([r], role));
  const free = (role: ReminderRole) => freeChannels(reminders.recipients, role);
  /** A role's draft, if it's on screen. Its channel snaps to a free one once a contact is saved. */
  function draftOf(role: ReminderRole): ContactDraft | undefined {
    const channels = free(role);
    if (channels.length === 0) return undefined;
    if (contactsOf(role).length > 0 && !adding[role]) return undefined;
    const draft = drafts[role];
    return channels.includes(draft.channel) ? draft : blankDraft(channels[0]);
  }

  const typed = ROLES.flatMap((role) => {
    const draft = draftOf(role);
    return draft === undefined || draftBlank(draft) ? [] : [{ role, draft }];
  });
  const newContacts: AddRecipientRequest[] = typed.map(({ role, draft }) => ({
    role,
    channel: draft.channel,
    destination: draft.value,
  }));
  const invalid = typed.some(({ role, draft }) => draftProblem(draft, role) !== undefined);
  const addingOwner = typed.some((t) => t.role === "checkInSigner");
  const heirReachable = contactsOf("heir").length > 0 || typed.some((t) => t.role === "heir");
  const ownerNameMissing = heirReachable && !profile.ownerName?.trim();
  const profileDirty = profileDraft !== undefined && !sameProfile(profileDraft, savedProfile);

  let blocker: string | undefined;
  if (!hasSubscription && !addingOwner) blocker = "Add where we should remind you.";
  else if (invalid) blocker = "Check the highlighted contact.";
  else if (ownerNameMissing) blocker = "Add what your heir calls you.";
  const changed = newContacts.length > 0 || profileDirty;
  const ready = changed && blocker === undefined;
  // Setup keeps the bar up to show what's missing; afterwards it only rises with a change.
  const showBar = reminders.status === "ready" && (!hasSubscription || changed);

  const verified =
    pending !== undefined &&
    reminders.recipients.some((r) => r.reminderRecipientId === pending.recipientId && r.verified);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(`/estate/${estate}`);
  }

  function setDraft(role: ReminderRole, draft: ContactDraft) {
    setDrafts((prev) => ({ ...prev, [role]: draft }));
  }

  function submit() {
    if (!ready) return;
    if (newContacts.length > 0) setReviewing(true);
    else commit();
  }

  function commit() {
    const heir = hasSubscription
      ? profileDirty
        ? profile
        : undefined
      : sameProfile(profile, EMPTY_PROFILE)
        ? undefined
        : profile;
    save.mutate(
      { hasSubscription, contacts: newContacts, heir },
      {
        onSuccess: (verifications) => {
          setReviewing(false);
          setDrafts({ checkInSigner: blankDraft(), heir: blankDraft() });
          setAdding({ checkInSigner: false, heir: false });
          setProfileDraft(undefined);
          save.reset();
          if (verifications.length > 0) {
            setQueue(verifications);
            setQueued(verifications.length);
          } else {
            setToast(hasSubscription ? "Saved." : "Reminders are on.");
          }
        },
      },
    );
  }

  function verify(contact: ContactState) {
    if (contact.kind !== "waiting") return;
    const target = {
      recipientId: contact.recipient.reminderRecipientId,
      role: (sameEnum(contact.recipient.role, "heir") ? "heir" : "checkInSigner") as ReminderRole,
      channel: channelOf(contact.recipient),
      destination: contact.recipient.destination,
    };
    // The email code is already in the inbox; open the sheet to type it, resend from there.
    if (target.channel === "email") {
      setQueue([{ ...target, sent: true }]);
      setQueued(1);
      return;
    }
    resend.mutate(target, {
      onSuccess: (next) => {
        if (next === undefined) return;
        setQueue([next]);
        setQueued(1);
      },
    });
  }

  function closeVerify() {
    setQueue((prev) => prev.slice(1));
    resend.reset();
    verifyEmail.reset();
  }

  function action(contact: ContactState, role: ReminderRole) {
    if (contact.kind === "connected") return <Badge label="Connected" fill={colors.lime} />;
    if (contact.kind === "none") return null;
    if (channelOf(contact.recipient) === "email" && role === "heir")
      return <Badge label="Pending" />;
    return (
      <PrimaryButton
        compact
        tone="paper"
        icon={role === "heir" ? "send" : undefined}
        label={resend.isPending ? "…" : role === "heir" ? "Invite" : "Verify"}
        disabled={resend.isPending}
        onPress={() => verify(contact)}
      />
    );
  }

  /** Saved contacts as rows, then the draft in place or an "add as well" button. */
  function contactBlock(role: ReminderRole) {
    const contacts = contactsOf(role);
    const channels = free(role);
    const draft = draftOf(role);
    return (
      <View style={{ gap: 14 }}>
        {contacts.length > 0 ? (
          <View>
            {contacts.map((contact, i) =>
              contact.kind === "none" ? null : (
                <ActionRow
                  key={contact.recipient.reminderRecipientId}
                  first={i === 0}
                  icon={channelOf(contact.recipient) === "email" ? "mail" : "telegram"}
                  title={
                    channelOf(contact.recipient) === "email"
                      ? contact.recipient.destination
                      : `@${contact.recipient.destination}`
                  }
                  sub={statusLine(contact, role)}
                  action={action(contact, role)}
                />
              ),
            )}
          </View>
        ) : null}
        {draft !== undefined ? (
          <View style={{ gap: 10 }}>
            <ContactFields
              role={role}
              channels={channels}
              draft={draft}
              onChange={(next) => setDraft(role, next)}
              disabled={save.isPending}
            />
            {contacts.length > 0 ? (
              <Pressable
                onPress={() => {
                  setAdding((prev) => ({ ...prev, [role]: false }));
                  setDraft(role, blankDraft());
                }}
                accessibilityRole="button"
                hitSlop={8}
                style={{ alignSelf: "flex-start" }}
              >
                <Text
                  style={{
                    fontFamily: font.medium,
                    fontSize: 13,
                    color: colors.mute,
                    textDecorationLine: "underline",
                  }}
                >
                  Never mind
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : channels.length > 0 ? (
          <View style={{ alignSelf: "flex-start" }}>
            <PillButton
              icon="plus"
              label={`Add ${channelLabel(channels[0] ?? "")} as well`}
              onPress={() => setAdding((prev) => ({ ...prev, [role]: true }))}
            />
          </View>
        ) : null}
      </View>
    );
  }

  let body;
  if (BACKEND_URL === undefined) {
    body = <Lede>Reminders aren’t available in this build.</Lede>;
  } else if (reminders.status === "locked") {
    body = (
      <Locked
        signing={session.signing}
        onSignIn={() => void session.signIn().catch(() => undefined)}
      />
    );
  } else if (reminders.status === "error") {
    body = (
      <View style={{ gap: 12 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
          {reminders.error ?? "Couldn't load reminders."}
        </Text>
        <PrimaryButton tone="paper" label="Try again" onPress={() => void reminders.refetch()} />
      </View>
    );
  } else if (reminders.status === "loading") {
    body = <Lede size={14}>Loading…</Lede>;
  } else {
    const ownerDone = contactsOf("checkInSigner").some((c) => c.kind === "connected");
    const heirDone = contactsOf("heir").some((c) => c.kind === "connected");
    body = (
      <View style={{ gap: 16 }}>
        {!hasSubscription ? (
          <Animated.View entering={FadeInDown.duration(420)} style={{ gap: 10, marginBottom: 8 }}>
            <Display size={34}>Never miss a check-in.</Display>
            <Lede size={15}>
              Tell us where to reach you, and who to tell if you go quiet. One save sets it all up.
            </Lede>
          </Animated.View>
        ) : null}

        <Section
          step={1}
          title="Remind me"
          sub="Before each check-in is due, and through the grace period."
          done={ownerDone}
          delay={80}
        >
          {contactBlock("checkInSigner")}
        </Section>

        <Section
          step={2}
          title={heirName ? `Tell ${heirName}` : "Tell your heir"}
          sub="Only if the grace period runs out. They hear nothing before."
          done={heirDone}
          delay={160}
        >
          {contactBlock("heir")}
        </Section>

        <Section
          step={3}
          title="The heir alert"
          sub="A name they know, so it reads as you, not a scam."
          done={hasSubscription && !genericAlert(reminders.heir) && !profileDirty}
          delay={240}
        >
          <AlertPreview profile={profile} />
          <HeirProfileFields
            value={profile}
            onChange={setProfileDraft}
            requireOwnerName={heirReachable}
            disabled={save.isPending}
          />
        </Section>

        <Animated.View
          entering={FadeInDown.delay(320).duration(420)}
          style={{ gap: 12, marginTop: 8 }}
        >
          <Cap>When reminders go out</Cap>
          <ReminderTimeline />
        </Animated.View>

        {hasOthers ? <AllEstatesToggle /> : null}
      </View>
    );
  }

  const barHeight = 56 + 16 * 2 + Math.max(insets.bottom, 12);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingHorizontal: space.pad,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconButton icon="chevronLeft" label="Back" onPress={back} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink }}>Reminders</Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}
          >
            {name}
          </Text>
        </View>
        {reminders.status === "ready" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: space.rule,
              borderColor: colors.ink,
              backgroundColor: colors.lime,
            }}
          >
            <Icon name="unlock" size={14} weight={2.4} />
            <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.ink }}>
              Signed in
            </Text>
          </View>
        ) : null}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: (showBar ? barHeight : Math.max(insets.bottom, 16)) + 32,
        }}
      >
        {body}
      </ScrollView>

      {showBar ? (
        <Animated.View
          entering={SlideInDown.duration(380).springify().damping(20)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            gap: 8,
            paddingTop: 12,
            paddingHorizontal: space.pad,
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            backgroundColor: colors.bg,
            borderTopWidth: space.rule,
            borderTopColor: colors.ink,
            ...floatShadow,
          }}
        >
          {blocker !== undefined && (changed || !hasSubscription) ? (
            <Text
              style={{
                textAlign: "center",
                fontFamily: font.medium,
                fontSize: 13,
                color: colors.mute,
              }}
            >
              {blocker}
            </Text>
          ) : null}
          {save.isError && !reviewing ? (
            <Text
              style={{
                textAlign: "center",
                fontFamily: font.semibold,
                fontSize: 13,
                color: colors.claim,
              }}
            >
              {reminderError(save.error)}
            </Text>
          ) : null}
          <PrimaryButton
            icon={ready ? "bell" : undefined}
            label={
              save.isPending ? "Saving…" : hasSubscription ? "Save changes" : "Turn on reminders"
            }
            disabled={!ready || save.isPending}
            onPress={submit}
          />
        </Animated.View>
      ) : null}

      <InkToast text={toast} />

      {reviewing ? (
        <ReviewSheet
          contacts={newContacts}
          heirLabel={heirLabel}
          ownerName={heirReachable ? profile.ownerName?.trim() : undefined}
          saving={save.isPending}
          error={save.isError ? reminderError(save.error) : undefined}
          onBack={() => {
            setReviewing(false);
            save.reset();
          }}
          onSave={commit}
        />
      ) : null}
      {pending !== undefined ? (
        <VerifySheet
          key={pending.recipientId}
          pending={pending}
          verified={verified}
          step={queued > 1 ? `${queued - queue.length + 1} of ${queued}` : undefined}
          hasNext={queue.length > 1}
          estateName={name}
          heirLabel={heirLabel}
          resending={resend.isPending}
          verifying={verifyEmail.isPending}
          error={
            resend.isError
              ? reminderError(resend.error)
              : verifyEmail.isError
                ? verifyError(verifyEmail.error)
                : undefined
          }
          onResend={() => {
            verifyEmail.reset();
            resend.mutate(pending, {
              onSuccess: (next) => setQueue((prev) => [next ?? pending, ...prev.slice(1)]),
            });
          }}
          onVerify={(code) => {
            resend.reset();
            verifyEmail.mutate(code);
          }}
          onClose={closeVerify}
        />
      ) : null}
    </View>
  );
}
