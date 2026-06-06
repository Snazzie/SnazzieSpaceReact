#!/usr/bin/env python3
"""Emit the BLUNDER ad category: local-business owners flubbing their own InstaAd
recording (no announcer, no disclaimer). Two shapes:

  SPLIT  - a HARD FUMBLE where they stop and re-record. Two separate numbered spots
           (`ad-<slug>-1` / `-2`, titled "<Business> #1" / "#2"), same caller voice.
  LONG   - an INTERRUPTION (dog, phone, coworker, kids, customers) they push through in
           ONE longer take. Single spot, no number.

Every attempt names the BUSINESS and what it SELLS through the fumbling. Tagged
`"blunder": true`. TTS-safe: no em-dashes, no parenthetical sound effects; pause tokens
for timing. See the radio-blunders skill.

Business names are anchored to the constants below so the spoken name, the title, and the
slug never drift apart. Writes Website/src/data/radio/ad-*.json; generate-radio.py fills audio.
"""
import json
from pathlib import Path

OUT = Path(__file__).parent.parent / "Website/src/data/radio"

# --- Canonical business names (single source of truth) ----------------------------------
SALS, CARLS, WASH, MURPHYS, DAVES = "Sal's Pizza", "Carl's Carpets", "The Wash House", "Murphy's Auto", "Dave's Tax Service"
GREGS, TONYS, LOUS, HANKS, BRIGHT = "Greg's Appliances", "Tony's Gym", "Lou's Locksmith", "Hank's BBQ", "Bright Smile Dental"
MAXINES, RAPID, VINCES, SUNNY = "Maxine's Salon", "Rapid Plumbing", "Vince's Shoes", "Sunny Daycare"
FRANKS, GLAMOUR, BIGMIKES = "Frank's Bait Shop", "Glamour Nails", "Big Mike's Subs"
PETES, DONNAS, CORNER, VICS, TINYTOTS, LARRYS = "Pete's Hardware", "Donna's Diner", "The Corner Bakery", "Vic's Garage", "Tiny Tots Daycare", "Larry's Electronics"

DESC = "Recorded via InstaAd. Aired exactly as received."

# Local caller voices play the hapless owners. Cycled across the SPLIT set.
VOICES = [
    "caller-gary", "caller-steve", "caller-frank", "caller-darnell", "caller-chad",
    "caller-patricia", "caller-linda", "caller-winston", "caller-kim", "caller-mildred",
]

# --- SPLIT: hard fumbles, two numbered takes. (slug, name, attempt1, attempt2) ----------
SPLIT = [
    ("sals-pizza", SALS,
     f"It says read with energy. <p:0.3> Okay. <p:0.4> {SALS}, hot fresh pies delivered in thirty minutes! <p:0.4> Was that energetic?",
     f"Take two. <p:0.4> {SALS.upper()}, WE GOT PEPPERONI! <p:0.4> Too much energy. <p:0.3> My throat hurts."),

    ("carls-carpets", CARLS,
     f"Come on down to {CARLS} for plush carpet, rugs, and vinyl flooring, where, <p:0.4> where does the time go, honestly. <p:0.3> Sorry.",
     f"Carpets. <p:0.3> {CARLS} sells carpets, and we install them. <p:0.4> Do I even like carpet? <p:0.3> Thirty years."),

    ("the-wash-house", WASH,
     f"Best tacos in the whole, <p:0.4> wait. <p:0.3> This is the laundromat one. <p:0.3> {WASH}, fifty washers, open late. <p:0.4> Can I start over?",
     f"{WASH}, wash and fold, free wifi while you wait... <p:0.4> did I say tacos again? <p:0.3> No? <p:0.3> Okay good."),

    ("murphys-auto", MURPHYS,
     f"{MURPHYS}, oil changes, brakes, and new tires done right... <p:0.4> wait, is this thing on? <p:0.3> Hello?",
     f"Okay, it is on. <p:0.3> {MURPHYS}, we fix your car fast and cheap... <p:0.4> uh, is that blinker fluid? <p:0.3> Murphy, get over here."),

    ("daves-tax", DAVES,
     f"Hi, I am Dave. <p:0.3> {DAVES}, we do returns, refunds, and audits, and... <p:0.4> and... <p:0.3> I had it. <p:0.3> Give me a second.",
     f"Okay. <p:0.3> {DAVES}, we get you the biggest refund, <p:0.4> legally. <p:0.3> Mostly legally. <p:0.4> Cut that part."),

    ("gregs-appliances", GREGS,
     f"{GREGS}, washers, dryers, and fridges, all on sale for only, <p:0.3> uh, <p:0.4> Greg, what is the number? <p:0.3> We will fix it later.",
     f"{GREGS}, the price is, <p:0.4> still do not have it. <p:0.3> It is a good price. <p:0.3> Just come look."),

    ("tonys-gym", TONYS,
     f"And that is why we are number one! <p:0.4> Pause for laughter. <p:0.4> So come to {TONYS} to get swole.",
     f"Wait, is it swole or swol? <p:0.3> Swole. <p:0.4> {TONYS}, weights, treadmills, and a sauna. <p:0.3> The sauna is broken."),

    ("lous-locksmith", LOUS,
     f"Hi, welcome to {LOUS}, we cut keys and unlock cars... <p:0.4> oh. <p:0.3> Was that the beep? <p:0.4> Do I start again?",
     f"{LOUS}, locked out? We come to you, twenty four seven... <p:0.4> was THAT the beep? <p:0.3> I never know."),

    ("hanks-bbq", HANKS,
     f"{HANKS}, slow smoked brisket, ribs, and pulled pork... <p:0.4> okay, how do I send this? <p:0.3> Is there a button? <p:0.3> Hello?",
     f"Did it send? <p:0.3> {HANKS}, by the way, we also cater... <p:0.4> it is still going, is not it. <p:0.3> {HANKS}, everybody."),

    ("bright-smile", BRIGHT,
     f"Step one, state your business. <p:0.3> {BRIGHT}, cleanings, whitening, and crowns... <p:0.4> step two... <p:0.3> oh, I'm live, aren't I.",
     f"Okay, for real. <p:0.3> {BRIGHT}, we do fillings and root canals, <p:0.4> painlessly. <p:0.3> Mostly. <p:0.3> Do not say mostly."),

    ("maxines-salon", MAXINES,
     f"{MAXINES}, cuts, color, and blowouts, best prices in town, guaranteed! <p:0.4> They are not. <p:0.3> But legal said I could say it.",
     f"Take two. <p:0.3> {MAXINES}, walk-ins welcome, we do hair and nails... <p:0.4> is best a lie if I believe it? <p:0.3> Moving on."),

    ("rapid-plumbing", RAPID,
     f"Okay, three, two, one, <p:0.4> and... <p:0.3> {RAPID}, leaks, clogs, and water heaters... <p:0.4> wait, did I miss the start?",
     f"{RAPID}, we fix your pipes day or night... <p:0.4> no countdown this time. <p:0.3> Nailed it. <p:0.3> Did I?"),

    ("vinces-shoes", VINCES,
     f"{VINCES}, sneakers, boots, and sandals, with unparalleled service... <p:0.3> un-par-able? <p:0.4> Unparalleled. <p:0.3> Whatever, great shoes.",
     f"{VINCES}, we got every size, every style... <p:0.4> I still cannot say that word. <p:0.3> Just buy shoes."),

    ("sunny-daycare", SUNNY,
     f"{SUNNY}, safe, fun childcare for ages one to five, comma, <p:0.3> insert warm greeting here. <p:0.4> Am I supposed to read that part?",
     f"Okay, skipping that. <p:0.3> {SUNNY}, we got naps, snacks, and finger painting... <p:0.4> insert price here. <p:0.3> Did it again."),

    ("franks-bait", FRANKS,
     f"Okay, be cool. <p:0.3> {FRANKS}, worms, lures, and live minnows for all your fishing... <p:0.4> is it weird I am sweating? <p:0.3> Oh, it is on.",
     f"{FRANKS}, we open at five a.m. for the early birds... <p:0.4> why did I lead with worms. <p:0.3> Come get bait."),

    ("glamour-nails", GLAMOUR,
     f"Welcome to, <p:0.3> uh, <p:0.4> what are we called now? <p:0.3> {GLAMOUR}! <p:0.4> Manicures, pedicures, gel... <p:0.3> or is it Glamorous Nails.",
     f"{GLAMOUR}, we do acrylics and pedicures... <p:0.4> the sign says Glamour, right? <p:0.3> Print is too small. <p:0.3> Come in anyway."),

    ("big-mikes-subs", BIGMIKES,
     f"{BIGMIKES}, foot-long sandwiches stacked with meat, fresh baked bread, every topping you can think of, and we are located at four twenty two East Maple, right next to the",
     f"Okay, they cut me off. <p:0.3> {BIGMIKES}, the address is four twenty two East Maple, next to the laundro"),
]

# --- LONG: one continuous interrupted take. (slug, name, voice, text) --------------------
LONG = [
    ("petes-hardware", PETES, "caller-gary",
     f"Come on down to {PETES} for tools, lumber, and paint, <p:0.3> Rusty, no. <p:0.4> We got drills, we got saws, we got... <p:0.3> Rusty, put that DOWN. <p:0.4> Where was I. <p:0.3> Power tools, garden supplies, and the best prices in town, <p:0.4> oh come on, that is a customer's order. <p:0.3> {PETES}. <p:0.4> RUSTY."),

    ("donnas-diner", DONNAS, "caller-patricia",
     f"{DONNAS}, best pancakes and bottomless coffee in town, open six to noon, <p:0.3> hold on, phone. <p:0.4> {DONNAS}. No, we're closed. <p:0.3> Okay, where was I. <p:0.4> We got eggs, bacon, hash browns, and fresh biscuits, <p:0.3> table four, I'll be right there! <p:0.4> Sorry. <p:0.3> {DONNAS}, come hungry, leave... <p:0.4> it's ringing again. <p:0.3> Forget it."),

    ("corner-bakery", CORNER, "caller-frank",
     f"{CORNER}, fresh bread, croissants, and cakes baked every morning, <p:0.3> I am not doing the jingle. <p:0.4> No, YOU did it last time. <p:0.3> We got muffins, we got pies, we got... <p:0.4> I am NOT singing it. <p:0.3> {CORNER}, come for the bread, stay for the... <p:0.4> fine, are we even recording? <p:0.3> Oh no."),

    ("vics-garage", VICS, "caller-darnell",
     f"{VICS}, we do oil changes, brakes, and new tires, <p:0.3> Vic, I'm recording! <p:0.4> Fast and affordable, with certified... <p:0.4> Vic, the lift is making that noise again. <p:0.3> Mechanics you can trust. <p:0.4> What? <p:0.3> No, the OTHER car. <p:0.4> {VICS}. <p:0.3> I gotta go."),

    ("tiny-tots", TINYTOTS, "caller-linda",
     f"Welcome to {TINYTOTS}, where your little ones get safe, loving care, <p:0.3> Aiden, off the table. <p:0.4> We got games, naps, and... <p:0.3> who has the marker? <p:0.4> WHO has the marker. <p:0.3> Healthy snacks, music, and story time, <p:0.4> sweetie, that is not food. <p:0.3> {TINYTOTS}, now enrolling, <p:0.4> okay, nobody move."),

    ("larrys-electronics", LARRYS, "caller-steve",
     f"{LARRYS}, your spot for TVs, laptops, and the latest phones, <p:0.3> sir, that is the display model. <p:0.4> All on sale this weekend, with free... <p:0.3> no, returns are at the front. <p:0.4> Free delivery and setup! <p:0.3> {LARRYS}, where the deals are... <p:0.4> SIR. <p:0.3> Unbeatable. <p:0.4> Somebody help him."),
]


def emit(slug, title, voice, lines):
    data = {
        "slug": f"ad-{slug}", "title": title, "description": DESC,
        "type": "ad", "blunder": True,
        "lines": [{"speaker": voice, "text": t, "overlap": 0, "timestamp": 0.0, "duration": 0.0} for t in lines],
    }
    (OUT / f"ad-{slug}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  wrote ad-{slug}.json ({voice})")


def main():
    for i, (slug, name, a1, a2) in enumerate(SPLIT):
        voice = VOICES[i % len(VOICES)]
        emit(f"{slug}-1", f"{name} #1", voice, [a1])
        emit(f"{slug}-2", f"{name} #2", voice, [a2])
    for slug, name, voice, text in LONG:
        emit(slug, name, voice, [text])
    print(f"\n{len(SPLIT) * 2} split takes + {len(LONG)} long spots = {len(SPLIT) * 2 + len(LONG)} blunder ads.")


if __name__ == "__main__":
    main()
