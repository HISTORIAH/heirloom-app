import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { TAB_BAR_CLEARANCE } from "@/components/FloatingTabBar";
import { InkToast } from "@/components/InkToast";
import { TopBar } from "@/components/TopBar";
import { EstateFacts } from "@/components/home/EstateFacts";
import { EstateHero } from "@/components/home/EstateHero";
import { EstateListRow } from "@/components/home/EstateList";
import { RoleSections } from "@/components/home/RoleSections";
import { Welcome } from "@/components/home/Welcome";
import {
  Cap,
  Dashed,
  Display,
  GhostAdd,
  Lede,
  PillButton,
  PrimaryButton,
  Steps,
  TextLink,
} from "@/components/ui";
import { takeFlash } from "@/lib/flash";
import { colors, font, space } from "@/theme";
import { useEstates, useHeirTx, useOwnerTx, useRoles } from "@/hooks";
import { bySoonest, estateSpan, presentGuardian } from "@/lib";
import { EstateRow } from "@/types/program";

function NothingYet({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={{ gap: 18 }}>
      <Cap>Estates</Cap>
      <Display size={34}>Nothing protected yet.</Display>
      <Lede>An estate holds assets for one heir. You check in to show you’re still around.</Lede>
      <Steps
        items={[
          {
            title: "Pick an heir",
            body: "A wallet address, or a Heirloom credential you hand them.",
          },
          { title: "Choose assets", body: "SOL and tokens from this wallet." },
          { title: "Set your check-in", body: "How often, and how long your heir waits." },
        ]}
      />
      <PrimaryButton icon="plus" label="Create an estate" onPress={onCreate} />
    </View>
  );
}

function NoRolesNote() {
  return (
    <Dashed style={{ gap: 6 }}>
      <Cap>Roles on this wallet</Cap>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.mute }}>
        If someone names this wallet as heir, guardian or check-in signer, it shows up here.
      </Text>
    </Dashed>
  );
}

function CreateNudge({ onCreate }: { onCreate: () => void }) {
  return (
    <Dashed style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
          No estate of your own yet
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}>
          Takes a few minutes.
        </Text>
      </View>
      <PrimaryButton compact tone="paper" icon="plus" label="Create" onPress={onCreate} />
    </Dashed>
  );
}

function ListHead({ count, onCreate }: { count: number; onCreate: () => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Cap>{`Estates · ${count} · soonest first`}</Cap>
      <PillButton icon="plus" label="New estate" onPress={onCreate} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { account, connect } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("authority");
  const roles = useRoles();
  const { checkIn, checkInAll } = useOwnerTx();
  const { sendHeartbeat } = useHeirTx();
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const { ask, notice, fail, cancel, confirm, extra } = useConfirmSheet();

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      const text = takeFlash();
      if (text !== undefined) setToast(text);
    }, []),
  );

  async function onConnect() {
    if (busy) return;
    setBusy(true);
    try {
      await connect();
    } catch (cause) {
      fail("Wallet", cause);
    } finally {
      setBusy(false);
    }
  }

  async function run(key: string, title: string, work: () => Promise<unknown>, done: string) {
    if (busy) return;
    setBusy(true);
    setWorking(key);
    try {
      await work();
      await Promise.all([reload(), roles.reload()]);
      setToast(done);
    } catch (cause) {
      fail(title, cause);
    } finally {
      setBusy(false);
      setWorking(undefined);
    }
  }

  function onGuardian(row: EstateRow) {
    const view = presentGuardian(row);
    notice({
      cap: "Guardian",
      title: view.canHold ? "Pausing from the app comes next" : view.eyebrow,
      body: view.advice,
    });
  }

  const onCreate = () => router.push("/create");
  const openEstate = (row: EstateRow) => router.push(`/estate/${row.address}`);
  const openClaim = (row: EstateRow) => router.push(`/claim?estate=${row.address}`);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), roles.reload()]);
    setRefreshing(false);
  }

  if (!account) {
    return (
      <View style={{ flex: 1 }}>
        <Welcome busy={busy} onConnect={() => void onConnect()} />
        <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
      </View>
    );
  }

  const sorted = bySoonest(rows);
  const hero = sorted[0];
  const live = sorted.filter(
    (row) => estateSpan(row.data, row.claimableLamports).state !== "distributed",
  );
  const hasRoles = roles.count > 0;

  const roleSections = hasRoles ? (
    <RoleSections
      heir={roles.heir}
      signer={roles.signer}
      guardian={roles.guardian}
      signingFor={working}
      busy={busy}
      onSignerCheckIn={(row) =>
        void run(
          row.address,
          "Check-in",
          () => sendHeartbeat(row.data.authority, row.data.heir),
          "Checked in for them.",
        )
      }
      onGuardian={onGuardian}
      onHeir={openClaim}
    />
  ) : null;

  let body;
  if (loading && rows.length === 0) {
    body = <ChainLoading compact body="Looking for your estates…" />;
  } else if (error !== null && rows.length === 0) {
    body = (
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.claim }}>
          {error}
        </Text>
        <TextLink align="left" label="Try again" onPress={() => void reload()} />
      </View>
    );
  } else if (hero === undefined) {
    body = hasRoles ? (
      <View style={{ gap: 24 }}>
        {roleSections}
        <CreateNudge onCreate={onCreate} />
      </View>
    ) : (
      <View style={{ gap: 22 }}>
        <NothingYet onCreate={onCreate} />
        <NoRolesNote />
      </View>
    );
  } else if (sorted.length === 1) {
    body = (
      <View style={{ gap: 14 }}>
        <EstateHero
          row={hero}
          busy={working === hero.address}
          disabled={busy}
          onCheckIn={() =>
            void run(hero.address, "Check-in", () => checkIn(hero.data.heir), "Checked in.")
          }
          onOpen={() => openEstate(hero)}
        />
        <EstateFacts row={hero} />
        <GhostAdd label="Add another estate" onPress={onCreate} />
        {roleSections !== null ? <View style={{ marginTop: 12 }}>{roleSections}</View> : null}
      </View>
    );
  } else {
    body = (
      <View style={{ gap: 12 }}>
        <EstateHero
          row={hero}
          busy={working === hero.address}
          disabled={busy}
          onCheckIn={() =>
            void run(hero.address, "Check-in", () => checkIn(hero.data.heir), "Checked in.")
          }
          onOpen={() => openEstate(hero)}
        />
        {live.length > 1 ? (
          <PrimaryButton
            tone="paper"
            label={
              working === "all"
                ? "Confirm in wallet…"
                : `Check in on all ${live.length} · one signature`
            }
            disabled={busy}
            onPress={() =>
              void run(
                "all",
                "Check-in",
                () => checkInAll(live.map((row) => row.data.heir)),
                `Checked in on ${live.length} estates.`,
              )
            }
          />
        ) : null}
        <View style={{ marginTop: 10 }}>
          <ListHead count={sorted.length} onCreate={onCreate} />
          {sorted.map((row) => (
            <EstateListRow key={row.address} row={row} onPress={() => openEstate(row)} />
          ))}
        </View>
        {roleSections !== null ? <View style={{ marginTop: 16 }}>{roleSections}</View> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 8,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {body}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
      <InkToast text={toast} />
    </View>
  );
}
