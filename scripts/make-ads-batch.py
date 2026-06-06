#!/usr/bin/env python3
"""One-off: emit 30 new Snazzie FM ad JSONs (diabolical deadpan parody).

Each ad = announcer line + disclaimer line. Disclaimer clauses are joined with
`<p:0>` zero-gap splits (OmniVoice drops clauses from a long fast utterance
otherwise — see radio-adverts skill). Writes Website/src/data/radio/ad-<slug>.json
with authoring-only fields; generate-radio.py fills timestamp/duration/audio.
"""
import json
import re
from pathlib import Path

OUT = Path(__file__).parent.parent / "Website/src/data/radio"


def split_sentences(text: str) -> str:
    """Insert a small pause after each sentence break. OmniVoice drops clauses from a
    long single utterance (same failure as disclaimers); splitting forces each
    sentence to render as its own segment. 0.2s keeps a natural announcer cadence
    (vs the disclaimer's gapless <p:0> rattle)."""
    return re.sub(r"([.!?])\s+", r"\1 <p:0.2> ", text.strip())

# Neutral announcer voices cycled across the batch (clean names, no theme mismatch).
ANN_POOL = [
    "ad-announcer", "ad-ann-deep", "ad-ann-gravel",
    "ad-ann-smooth", "ad-ann-nasal", "ad-ann-shouty", "ad-ann-chipper",
]

# (slug, title, description, announcer_text, [disclaimer clauses ... last is the sign-off])
ADS = [
    ("dirt-nap", "Dirt Nap Express",
     "A paid message from Dirt Nap Express. Why wait to die when you can save now?",
     "Funerals too expensive? At Dirt Nap Express, we pre-bury you TODAY at a discount! Beat the rush, skip the line, and rest easy knowing the hole is already dug. Dirt Nap Express, go early, save big!",
     ["Pre-burial is permanent and non-refundable.", "Breathing inside the unit voids the warranty.",
      "We are not liable for premature reanimation.", "Terms and conditions apply."]),

    ("awake-forever", "Awake Forever",
     "A paid message from Awake Forever. Sleep is for the unemployed.",
     "Tired of being tired? One Awake Forever capsule keeps you wired for nine straight days! No sleep, no slowdown, no problem. Awake Forever, the last good night you'll ever need!",
     ["Awake Forever is not approved for human use.", "May cause severe insomnia, heart palpitations, and dependency.",
      "The crash lasts as long as the high.", "Terms and conditions apply."]),

    ("toothy", "Toothy's Discount Dental",
     "A paid message from Toothy's. A smile is just teeth showing off.",
     "Got a toothache? Toothy's Discount Dental pulls ALL your teeth for the price of one! No appointment, no anesthetic, no questions. Toothy's, we'll find the bad one eventually!",
     ["Procedures performed by a man named Greg.", "Number of teeth removed may exceed the number present.",
      "Gums sold separately.", "Terms and conditions apply."]),

    ("spareparts", "SpareParts Plus",
     "A paid message from SpareParts Plus. Pre-owned organs at unbeatable prices.",
     "Need a kidney? A lung? A spare heart for the weekend? SpareParts Plus has gently used organs at rock-bottom prices! Mystery cooler special every Friday. SpareParts Plus, somebody's loss is your liver!",
     ["Organs may not match your blood, species, or decade.", "All sales final once installed.",
      "The cooler is non-negotiable and must be returned.", "Terms and conditions apply."]),

    ("plummet-air", "PlummetAir",
     "A paid message from PlummetAir. The cheapest way down.",
     "Flying somewhere? PlummetAir gets you there for nine dollars! No seats, no doors, no second pilot. Just you, the sky, and a firm handshake on departure. PlummetAir, you'll land somewhere!",
     ["Landing is a goal, not a guarantee.", "Oxygen is a premium add-on.",
      "The exit row is the entire plane.", "Terms and conditions apply."]),

    ("dream-warden", "DreamWarden",
     "A paid message from DreamWarden. The mattress that cares too much.",
     "Sleep like a baby on the DreamWarden, the smart mattress that watches you all night for safety! It learns your breathing, your secrets, your fears. DreamWarden, it knows when you're awake!",
     ["The mattress retains everything it observes.", "Do not attempt to sleep elsewhere.",
      "DreamWarden has already contacted your mother.", "Terms and conditions apply."]),

    ("ghost-ledger", "GhostLedger",
     "A paid message from GhostLedger. Taxes are just suggestions.",
     "Paying taxes like a sucker? GhostLedger makes your income legally invisible! The government simply forgets you exist. No income, no tax, no name. GhostLedger, become a rumor!",
     ["You will also be forgotten by friends and banks.", "Existence cannot be restored after filing.",
      "We have never heard of you.", "Terms and conditions apply."]),

    ("lil-sustenance", "Lil' Sustenance",
     "A paid message from Lil' Sustenance. Off-brand nutrition for growing whatevers.",
     "Babies expensive? Lil' Sustenance is the budget formula that's technically food! Forty percent powder, sixty percent enthusiasm. Lil' Sustenance, they'll probably be fine!",
     ["Lil' Sustenance is not approved for infants.", "Nutritional content is estimated.",
      "Use under supervision of someone braver.", "Terms and conditions apply."]),

    ("moat-master", "MoatMaster",
     "A paid message from MoatMaster. Home security, medieval edition.",
     "Worried about intruders? MoatMaster digs a thirty-foot moat around your home overnight! Add crocodiles for nine bucks. No one gets in, including you. MoatMaster, defend the castle!",
     ["Crocodiles do not distinguish family from foe.", "Mail service permanently suspended.",
      "Drawbridge sold as a separate ordeal.", "Terms and conditions apply."]),

    ("air-prime", "AirPrime",
     "A paid message from AirPrime. Premium oxygen on a monthly plan.",
     "Still breathing for free like an animal? AirPrime delivers premium oxygen straight to your face for one low subscription! Cancel anytime, suffocate immediately. AirPrime, breathe responsibly!",
     ["Free-tier air contains visible chunks.", "Missed payments pause your respiration.",
      "Inhaling competitor air is theft.", "Terms and conditions apply."]),

    ("splitsville", "SplitsVille Kit",
     "A paid message from SplitsVille. Divorce in a box.",
     "Marriage not working? The SplitsVille Kit ends it in minutes, no lawyer required! Just add signatures and resentment. Comes with two boxes for your stuff. SplitsVille, conscious uncoupling, unconscious pricing!",
     ["Kit divides assets at random.", "Custody determined by a coin we provide.",
      "The coin always lands on the dog.", "Terms and conditions apply."]),

    ("sugar-be-gone", "SugarBeGone",
     "A paid message from SugarBeGone. Insulin, but it's from a guy.",
     "Insulin too pricey? SugarBeGone is the affordable alternative brewed in a real garage! Same idea, different everything. SugarBeGone, probably insulin-adjacent!",
     ["Not insulin.", "May be paint.", "Effects range from fine to deeply not.",
      "Terms and conditions apply."]),

    ("eternal-stay", "Eternal Stay Resorts",
     "A paid message from Eternal Stay. The timeshare you can never leave.",
     "Dreaming of vacation? Eternal Stay Resorts offers a beautiful seaside suite for the unbeatable price of forever! Check in today. Check out is not a feature. Eternal Stay, you live here now!",
     ["The contract renews automatically and indefinitely.", "Maintenance fees rise every year.",
      "Cancellation is not offered.", "Terms and conditions apply."]),

    ("sue-per-saver", "Sue-Per Saver",
     "A paid message from Sue-Per Saver. Justice at warehouse prices.",
     "Been wronged? Sue-Per Saver sues anyone for nineteen dollars! No case too weak, no target too random. We'll sue the sky if you point at it. Sue-Per Saver, litigate everything!",
     ["Your lawyer is a parrot in a tie.", "You may be countersued by us.",
      "Winnings paid in expired coupons.", "Terms and conditions apply."]),

    ("pureish", "Pureish Water",
     "A paid message from Pureish. Hydration, broadly speaking.",
     "Thirsty? Pureish bottled water is sourced from a genuine puddle behind the plant! Crisp, refreshing, and full of surprises. Pureish, it's mostly water!",
     ["Pureish is not tested for safety.", "May contain sediment, bacteria, or wildlife.",
      "Boil before drinking.", "Terms and conditions apply."]),

    ("forget-me-lots", "Forget-Me-Lots",
     "A paid message from Forget-Me-Lots. The tea that erases the bad parts.",
     "Haunted by a memory? One cup of Forget-Me-Lots tea wipes it clean! That argument, that debt, that name. Gone. Forget-Me-Lots, what were we talking about?",
     ["Forget-Me-Lots may erase more than intended.", "Results are permanent and cannot be reviewed.",
      "Not responsible for forgotten debts or relatives.", "Terms and conditions apply."]),

    ("emotivault", "EmotiVault",
     "A paid message from EmotiVault. Self-storage for your feelings.",
     "Feelings in the way? EmotiVault stores your emotions off-site in a climate-controlled unit! Grief, dread, joy, all neatly boxed. EmotiVault, feel nothing for one low rate!",
     ["Stored emotions are non-refundable.", "Late fees apply to grief.",
      "Contents may be auctioned if your account lapses.", "Terms and conditions apply."]),

    ("swole-patrol", "Swole Patrol",
     "A paid message from Swole Patrol. A gym, legally.",
     "Want gains? Swole Patrol is the discount gym with no rules, no staff, and one extremely heavy rock! Lift the rock. Become the rock. Swole Patrol, lift or perish!",
     ["The rock has injured everyone.", "There is no exit, only the rock.",
      "Membership is inherited by your next of kin.", "Terms and conditions apply."]),

    ("skybury", "SkyBury",
     "A paid message from SkyBury. Funerals by drone.",
     "Lost a loved one? SkyBury launches them into the heavens via our affordable delivery drone! Eco-friendly, mostly accurate. SkyBury, ashes to airspace!",
     ["Drone occasionally returns the deceased.", "Flight path not approved by anyone.",
      "May reach a neighbor's barbecue.", "Terms and conditions apply."]),

    ("luckbrand", "LuckBrand",
     "A paid message from LuckBrand. Generic fortune in a can.",
     "Down on your luck? Crack open a can of LuckBrand, the world's first drinkable good fortune! Win the lottery, dodge the bus, find a twenty. LuckBrand, fortune favors the hydrated!",
     ["LuckBrand contains no actual luck.", "Results are coincidental and unverified.",
      "Any misfortune is not our responsibility.", "Terms and conditions apply."]),

    ("paw-equity", "PawEquity",
     "A paid message from PawEquity. Reverse mortgages for pets.",
     "Does your dog own its home? PawEquity unlocks the value of your pet's property with one easy signature! Your dog gets cash, you get the leash. PawEquity, let the goodboy invest!",
     ["The pet does not understand the contract.", "Neither do you.",
      "The cat has already refinanced twice.", "Terms and conditions apply."]),

    ("rugcoin", "RugCoin",
     "A paid message from RugCoin. The coin that believes in you, briefly.",
     "Missed crypto? RugCoin is the next big thing until approximately Thursday! Buy in now, retire by lunch, panic by dinner. RugCoin, to the moon and slightly past it!",
     ["Value determined by a man named Chad's mood.", "Withdrawals are a theoretical concept.",
      "The rug was always going to be pulled.", "Terms and conditions apply."]),

    ("burnguard", "BurnGuard",
     "A paid message from BurnGuard. Sunscreen, allegedly.",
     "Heading outside? Slather on BurnGuard, the budget sunscreen with SPF one! Smells like a tire, protects like a rumor. BurnGuard, you'll tan, then transcend!",
     ["May intensify the sun rather than block it.", "Glows for legal reasons.",
      "Do not apply near other people's skin.", "Terms and conditions apply."]),

    ("docbot", "DocBot 200",
     "A paid message from DocBot. At-home surgery has never been this confident.",
     "Need surgery? The DocBot 200 operates on you at home for one flat fee! It's fast, it's autonomous, it's mostly read the manual. DocBot 200, hold still and trust the machine!",
     ["DocBot is not a licensed medical device.", "May operate on the wrong area.",
      "Repairs to the patient are billed separately.", "Terms and conditions apply."]),

    ("growfast", "GrowFast Prime",
     "A paid message from GrowFast. Lawn fertilizer with opinions.",
     "Want a greener yard? GrowFast Prime grows grass six feet overnight, and it's starting to think! Lush, vibrant, increasingly aware. GrowFast Prime, the lawn that loves back!",
     ["Contains undisclosed industrial chemicals.", "Do not inhale, ingest, or touch the lawn.",
      "Runoff may affect neighboring yards.", "Terms and conditions apply."]),

    ("renta-guard", "RentaGuard",
     "A paid message from RentaGuard. Personal protection on a budget.",
     "Feeling unsafe? RentaGuard sends a discount bodyguard to your door in minutes! He's large, he's loyal-ish, he's mostly sober. RentaGuard, he'll probably take the hit!",
     ["Guard may switch sides for a sandwich.", "Provides protection, not allegiance.",
      "He lives with you now.", "Terms and conditions apply."]),

    ("instavows", "InstaVows",
     "A paid message from InstaVows. Weddings while you wait.",
     "Getting married? InstaVows officiates your wedding in ninety seconds flat, drive-thru style! No license, no waiting, no take-backs. InstaVows, kiss the bride and keep moving!",
     ["InstaVows marriages may not be legally recognized.", "The officiant holds no certification.",
      "Annulment requires a second drive-thru.", "Terms and conditions apply."]),

    ("meat-tube", "Meat Tube",
     "A paid message from Meat Tube. A sandwich, structurally.",
     "Hungry on the go? Grab a Meat Tube, the protein cylinder of mystery and value! One dollar, one tube, one question you won't ask. Meat Tube, chew with optimism!",
     ["Contents are not classified as a single animal.", "May contain bone, gristle, or surprise.",
      "Consume at your own discretion.", "Terms and conditions apply."]),

    ("foreverface", "ForeverFace",
     "A paid message from ForeverFace. Anti-aging cement.",
     "Worried about wrinkles? ForeverFace seals your skin in fast-drying cosmetic cement, locking in youth permanently! Smooth, firm, immovable. ForeverFace, age cannot find you now!",
     ["Facial expressions are no longer available.", "Cement is load-bearing and final.",
      "Do not let it rain on your head.", "Terms and conditions apply."]),

    ("honkheal", "HonkHeal",
     "A paid message from HonkHeal. Mental wellness, delivered by goose.",
     "Feeling low? Call the Honk and Heal hotline and a trained therapy goose will listen to your problems! Affordable, attentive, deeply hostile. Honk and Heal, let it all honk out!",
     ["This is not a licensed therapy service.", "We retain the right to broadcast your sessions on Twitch and YouTube.",
      "The goose holds no medical credentials.", "Terms and conditions apply."]),
]


def build(slug, title, desc, ann_text, disc_clauses, ann_voice):
    disclaimer = " <p:0> ".join(disc_clauses)
    return {
        "slug": f"ad-{slug}",
        "title": title,
        "description": desc,
        "type": "ad",
        "lines": [
            {"speaker": ann_voice, "text": split_sentences(ann_text), "overlap": 0, "timestamp": 0.0, "duration": 0.0},
            {"speaker": "ad-disclaimer", "text": disclaimer, "overlap": 0, "timestamp": 0.0, "duration": 0.0},
        ],
    }


def main():
    for i, (slug, title, desc, ann_text, disc) in enumerate(ADS):
        voice = ANN_POOL[i % len(ANN_POOL)]
        data = build(slug, title, desc, ann_text, disc, voice)
        path = OUT / f"ad-{slug}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  wrote {path.name} (announcer: {voice})")
    print(f"\n{len(ADS)} ad JSONs written.")


if __name__ == "__main__":
    main()
