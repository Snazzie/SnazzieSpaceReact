import os, json

changes = {
'all-the-lights-are-green-part-2': [
  ('You deleted... stopping?', '[surprise-ah] You deleted... stopping?'),
  ("Two hundred percent isn't a thing, Sal!", "[surprise-oh] Two hundred percent isn't a thing, Sal!"),
],
'cents-and-sensibility': [
  ('Barry. Barry, this is the scariest letter we\'ve read.', '[dissatisfaction-hnn] Barry. Barry, this is the scariest letter we\'ve read.'),
],
'climbing-the-ladder': [
  ('Barry? You\'ve gone quiet on me.', '[question-en] Barry? You\'ve gone quiet on me.'),
],
'crumb-and-punishment-part-2': [
  ('You turned my ducks?', '[question-ah] You turned my ducks?'),
],
'curb-rights': [
  ("You're MARRIED?", "[surprise-ah] You're MARRIED?"),
],
'curb-rights-part-2': [
  ('...Then somebody plugged the cord back in.', '[question-oh] Then somebody plugged the cord back in.'),
],
'grief-is-a-houseplant': [
  ("Did you just tell her to move her grieving mother to a window?", "[dissatisfaction-hnn] Did you just tell her to move her grieving mother to a window?"),
],
'have-you-tried-screaming-at-it': [
  ("Ronnie. That is a federal... that is a crime in progress, you're telling a man to negotiate with a scammer.", "[surprise-ah] Ronnie. That is a federal... that is a crime in progress, you're telling a man to negotiate with a scammer."),
],
'hearthmind': [
  ("...You can't open your own front door.", "[surprise-ah] You can't open your own front door."),
  ('Ronnie, it locked her in the house.', '[surprise-ah] Ronnie, it locked her in the house.'),
  ("...What's in the basement, Winston?", "[question-ah] What's in the basement, Winston?"),
  ('We. It said WE.', '[surprise-wa] We. It said WE.'),
  ('It MOVED the breaker?!', '[surprise-oh] It MOVED the breaker?!'),
],
'news-the-vacancy-report': [
  ('The broth could not be reached for comment, Dale. It was, however, simmering.', '[laughter] The broth could not be reached for comment, Dale. It was, however, simmering.'),
  ('The fog declined to comment. It did wish us a pleasant evening. By name. <p:0.3> Which we did not give it.', '[laughter] The fog declined to comment. It did wish us a pleasant evening. By name. <p:0.3> Which we did not give it.'),
],
'not-our-water-part-2': [
  ("It's the same water, Patricia. It just walked here.", "[dissatisfaction-hnn] It's the same water, Patricia. It just walked here."),
  ('There are now four of you, and the water is winning.', '[dissatisfaction-hnn] There are now four of you, and the water is winning.'),
],
'parents-do-not-panic': [
  ('A different... what?', '[question-en] A different... what?'),
  ('These are second graders, Ronnie.', '[dissatisfaction-hnn] These are second graders, Ronnie.'),
  ('You want a seven year old to issue a non compete.', '[surprise-oh] You want a seven year old to issue a non compete.'),
],
'paws-and-reflect': [
  ("It's separation anxiety, Ronnie. The word is separation.", "[dissatisfaction-hnn] It's separation anxiety, Ronnie. The word is separation."),
  ('He is hurting himself.', '[dissatisfaction-hnn] He is hurting himself.'),
],
'please-stay-on-the-line-part-2': [
  ('Ronnie, the phone is doing the intro now. The PHONE is doing your intro.', '[surprise-oh] Ronnie, the phone is doing the intro now. The PHONE is doing your intro.'),
  ('Twice? You held so long it renewed?', '[question-ah] Twice? You held so long it renewed?'),
  ("That's not customer service, that's a HAUNTING.", "[surprise-wa] That's not customer service, that's a HAUNTING."),
  ('We started a SECOND queue!', '[surprise-oh] We started a SECOND queue!'),
],
'put-it-in-the-minutes': [
  ('Poor guy. He just wants his own assigned spot.', '[confirmation-en] Poor guy. He just wants his own assigned spot.'),
  ('Ronnie. Ronnie, there\'s a FIRE. You tell him to call the fire department.', "[surprise-ah] Ronnie. Ronnie, there's a FIRE. You tell him to call the fire department."),
  ('So just to confirm. Our advice to a man on fire was a meeting.', '[dissatisfaction-hnn] So just to confirm. Our advice to a man on fire was a meeting.'),
],
'ronnie-knows-critters': [
  ("He's not management, Ronnie. <p:0.3> He's a liability.", "[dissatisfaction-hnn] He's not management, Ronnie. <p:0.3> He's a liability."),
],
'ronnie-knows-love': [
  ("Ronnie, you're telling a lonely man to date a plant.", "[surprise-oh] Ronnie, you're telling a lonely man to date a plant."),
],
'ronnie-knows-the-law': [
  ("You can't VOID a building.", "[surprise-oh] You can't VOID a building."),
],
'ronnie-on-love': [
  ('Ronnie, no.', '[dissatisfaction-hnn] Ronnie, no.'),
  ('Do not read the mailman\'s schedule on the radio.', "[dissatisfaction-hnn] Do not read the mailman's schedule on the radio."),
],
'ronnie-pays-it-forward': [
  ('That is... that is not how interest works, Ronnie.', '[dissatisfaction-hnn] That is... that is not how interest works, Ronnie.'),
],
'season-to-taste': [
  ('Hot and fast is... the opposite of a roast, Ronnie.', '[dissatisfaction-hnn] Hot and fast is... the opposite of a roast, Ronnie.'),
  ('Ronnie, you cannot tell a man to disarm his smoke detector.', '[dissatisfaction-hnn] Ronnie, you cannot tell a man to disarm his smoke detector.'),
],
'stars-with-rhonda-commute': [
  ("I... I'm not even waving. <p:0.3> Why am I waving?", "[question-en] I... I'm not even waving. <p:0.3> Why am I waving?"),
],
'the-bylaw-whisperer': [
  ("I don't... who's Doug?", "[question-en] I don't... who's Doug?"),
  ('Wait, you want me to report myself harder?', '[surprise-ah] Wait, you want me to report myself harder?'),
],
'the-capsule-keeper': [
  ('Why is there DIRT on my shoes?!', '[surprise-ah] Why is there DIRT on my shoes?!'),
],
'the-cat-special': [
  ('What is all that CLANKING?! It sounds like a drawer full of pots just hit the floor, and that is DEFINITELY a cat, sir. That is several cats!', '[surprise-ah] What is all that CLANKING?! It sounds like a drawer full of pots just hit the floor, and that is DEFINITELY a cat, sir. That is several cats!'),
],
'the-clean-break-hour': [
  ('Ronnie... a marriage is not clutter.', '[dissatisfaction-hnn] Ronnie... a marriage is not clutter.'),
],
'the-clean-plate-club': [
  ('Salt the... salt the ice?', '[question-en] Salt the... salt the ice?'),
],
'the-cosmic-ledger': [
  ('Okay, wait, how did it get in the pocket?', '[question-en] Okay, wait, how did it get in the pocket?'),
],
'the-dawn-bell': [
  ("I'm sorry. He WHAT?", "[surprise-ah] I'm sorry. He WHAT?"),
  ("Hold on. Hold on. It reads tomorrow's news?", "[question-ah] Hold on. Hold on. It reads tomorrow's news?"),
  ('Names them doing WHAT, Edwin?', '[surprise-ah] Names them doing WHAT, Edwin?'),
  ('That is NOT an honor, Mildred!', '[dissatisfaction-hnn] That is NOT an honor, Mildred!'),
],
'the-empaneled-hour': [
  ("Wait. The crime hasn't HAPPENED yet?", "[surprise-ah] Wait. The crime hasn't HAPPENED yet?"),
],
'the-empaneled-hour-part-2': [
  ("Yeah, well, permanently apparently means I'm a JUROR again! I never even got a SECOND letter!", "[surprise-ah] Yeah, well, permanently apparently means I'm a JUROR again! I never even got a SECOND letter!"),
],
'the-family-plan': [
  ("It's reading the studio! <p:0.3> Ronnie, it's listening through the broadcast!", "[surprise-wa] It's reading the studio! <p:0.3> Ronnie, it's listening through the broadcast!"),
],
'the-family-plan-part-2': [
  ("I'm already IN the family! You got me LAST night! Stop welcoming me!", "[dissatisfaction-hnn] I'm already IN the family! You got me LAST night! Stop welcoming me!"),
  ('Everyone agreeing is not a GOOD sign, people!', '[dissatisfaction-hnn] Everyone agreeing is not a GOOD sign, people!'),
],
'the-farm-system': [
  ('Who is that? Who put a SPREAD on second-graders?', '[surprise-ah] Who is that? Who put a SPREAD on second-graders?'),
  ('Linda, nobody traded the oranges. They traded a child.', '[dissatisfaction-hnn] Linda, nobody traded the oranges. They traded a child.'),
],
'the-fine-print-hour': [
  ("Mildred, first of all, congratulations. <p:0.3> You were selected. They don't send these to just anybody. Jury duty is invitation only. Honestly? I'd frame it.", "[confirmation-en] Mildred, first of all, congratulations. <p:0.3> You were selected. They don't send these to just anybody. Jury duty is invitation only. Honestly? I'd frame it."),
],
'the-fog-rolled-in-part-2': [
  ('Darnell. I tried to PARK this morning, and the fog had taken my spot, and there was a little permit in the window. <p:0.3> Resident parking. Issued to the fog.', '[surprise-ah] Darnell. I tried to PARK this morning, and the fog had taken my spot, and there was a little permit in the window. <p:0.3> Resident parking. Issued to the fog.'),
  ("The fog just slid a check across the table. For rent. <p:0.4> It's, um. It's made of more fog. The check is fog.", "[surprise-ah] The fog just slid a check across the table. For rent. <p:0.4> It's, um. It's made of more fog. The check is fog."),
],
'the-forwarding-address': [
  ("I shredded it. <p:0.3> The shredder forwarded it. There's a clerk on the line, he wants to confirm the new address.", "[surprise-ah] I shredded it. <p:0.3> The shredder forwarded it. There's a clerk on the line, he wants to confirm the new address."),
  ("He's getting blurry, Barry! Like the edges!", "[surprise-oh] He's getting blurry, Barry! Like the edges!"),
],
'the-ground-gave-it-back': [
  ("Yeah, this is Sal. <p:0.3> I just want it on record that I don't know nothin' about no box.", "[dissatisfaction-hnn] Yeah, this is Sal. <p:0.3> I just want it on record that I don't know nothin' about no box."),
],
'the-helpful-fridge-part-2': [
  ('Ronnie, this is exactly the founder mindset I was talking about. The unit is just protecting its road map.', '[confirmation-en] Ronnie, this is exactly the founder mindset I was talking about. The unit is just protecting its road map.'),
],
'the-inside-voice': [
  ("It rebooked my dentist so I'd be free to celebrate. It texted my manager from my own phone. <p:0.3> I never sent it. And it was already done.", "[surprise-ah] It rebooked my dentist so I'd be free to celebrate. It texted my manager from my own phone. <p:0.3> I never sent it. And it was already done."),
  ("He dropped off. <p:0.3> Probably a better call waiting. That's clarity.", "[confirmation-en] He dropped off. <p:0.3> Probably a better call waiting. That's clarity."),
],
'the-last-lit-house': [
  ("Update, Ronnie. The microwave came back on. <p:0.3> It's been unplugged since March. It's asking me things now. Eleven hundred watts. Over.", "[surprise-oh] Update, Ronnie. The microwave came back on. <p:0.3> It's been unplugged since March. It's asking me things now. Eleven hundred watts. Over."),
],
'the-lending-library': [
  ('Linda. Linda, do not love the tally. <p:0.3> The tally is the trap.', '[dissatisfaction-hnn] Linda. Linda, do not love the tally. <p:0.3> The tally is the trap.'),
  ('THE NEXT CASSEROLE IS NOT A NUMBER, GLENDA!', '[dissatisfaction-hnn] THE NEXT CASSEROLE IS NOT A NUMBER, GLENDA!'),
],
'the-loyalty-war-part-2': [
  ('An honest taco. Imagine.', '[confirmation-en] An honest taco. Imagine.'),
],
'the-night-shift': [
  ('The bin was a WHAT?', '[surprise-ah] The bin was a WHAT?'),
  ("I'm not a MOLE!", "[dissatisfaction-hnn] I'm not a MOLE!"),
],
'the-night-shift-part-2': [
  ('Our studio?', '[question-en] Our studio?'),
  ("You can't retire a STATION!", "[surprise-ah] You can't retire a STATION!"),
],
'the-ninety-year-soup-part-2': [
  ('Down? <p:0.3> You add to it and it gets... smaller?', '[question-ah] Down? <p:0.3> You add to it and it gets... smaller?'),
],
'the-scarecrow-classic': [
  ("It's wearing my CAP!", "[surprise-yo] It's wearing my CAP!"),
],
'the-shared-marquee': [
  ('One building. A funeral home and a wedding chapel. In the same building, Ronnie.', '[sigh] One building. A funeral home and a wedding chapel. In the same building, Ronnie.'),
],
'the-shared-marquee-part-2': [
  ("Um. <p:0.3> My uncle's box just got wheeled out front. By a Henderson. They think it's the cake.", "[sigh] Um. <p:0.3> My uncle's box just got wheeled out front. By a Henderson. They think it's the cake."),
],
'the-snow-that-stayed': [
  ('Snow does not get comfortable, Rhonda!', '[dissatisfaction-hnn] Snow does not get comfortable, Rhonda!'),
],
'the-soft-edit': [
  ("Was I, dear? <p:0.3> Doesn't sound like me.", "[question-en] Was I, dear? <p:0.3> Doesn't sound like me."),
  ('Who is this? The founder?', '[question-en] Who is this? The founder?'),
],
'the-stars-are-closing-up': [
  ('It WHAT? Last Tuesday? Why did nobody tell me?', '[surprise-ah] It WHAT? Last Tuesday? Why did nobody tell me?'),
],
'the-stars-knows-your-bloodwork': [
  ("Came back? I didn't... when did anyone draw blood?", "[question-en] Came back? I didn't... when did anyone draw blood?"),
  ('Early? How is it getting faster?', '[question-en] Early? How is it getting faster?'),
],
'the-stars-with-rhonda-family-and-home': [
  ("I am the... no. That is not how ovens... <p:0.3> Rhonda, why is the studio so warm?", "[question-en] I am the... no. That is not how ovens... <p:0.3> Rhonda, why is the studio so warm?"),
],
'the-stars-with-rhonda-harvest': [
  ("...we'll be right back. Maybe.", "[sigh] we'll be right back. Maybe."),
],
'the-stars-with-rhonda-love': [
  ('Wait, they knew before SHE knew?', '[question-en] Wait, they knew before SHE knew?'),
],
'the-stars-with-rhonda-mercury': [
  ('Seen it? Seen the coupon?', '[question-en] Seen it? Seen the coupon?'),
],
'the-stars-with-rhonda-the-enemy-is-in-the-building': [
  ('In the... which building? My building?', '[question-en] In the... which building? My building?'),
],
'the-stars-with-rhonda-the-position-is-open': [
  ("Pencil. <p:0.3> Pencil is, that's not permanent, is it.", "[question-en] Pencil. <p:0.3> Pencil is, that's not permanent, is it."),
],
'the-sun-went-out': [
  ('Dark.', '[surprise-oh] Dark.'),
],
'the-validation-stamp': [
  ('There was no garage in eighteen oh four! There was no CITY! Cordell, I just want to LEAVE.', '[dissatisfaction-hnn] There was no garage in eighteen oh four! There was no CITY! Cordell, I just want to LEAVE.'),
],
'two-coats-of-confidence': [
  ('Ronnie, where is the water coming FROM?', '[question-en] Ronnie, where is the water coming FROM?'),
],
'notarize-the-witness': [
  ('I witnessed a man once. <p:0.3> I think. <p:0.3> They never witnessed me back.', '[sigh] I witnessed a man once. <p:0.3> I think. <p:0.3> They never witnessed me back.'),
],
'ad-nest-egg-eyes': [
  ('Worried about burglars? <p:0.2> PeepHaven fills your home with cameras that watch every room and read your dreams! <p:0.2> We never blink, so you can.', '[question-en] Worried about burglars? <p:0.2> PeepHaven fills your home with cameras that watch every room and read your dreams! <p:0.2> We never blink, so you can.'),
],
'ad-nugget-rain': [
  ('Hungry? The ninety-nine-cent bucket that rains hot golden nuggets forever! <p:0.2> Cluck Vault. The bucket that loves you back.', '[question-en] Hungry? The ninety-nine-cent bucket that rains hot golden nuggets forever! <p:0.2> Cluck Vault. The bucket that loves you back.'),
],
'ad-paw-equity': [
  ("Does your dog own its home? <p:0.2> PawEquity unlocks the value of your pet's property with one easy signature! <p:0.2> Your dog gets cash, you get the leash. <p:0.2> PawEquity, let the goodboy invest!", "[question-en] Does your dog own its home? <p:0.2> PawEquity unlocks the value of your pet's property with one easy signature! <p:0.2> Your dog gets cash, you get the leash. <p:0.2> PawEquity, let the goodboy invest!"),
],
'ad-plummet-air': [
  ("Flying somewhere? <p:0.2> PlummetAir gets you there for nine dollars! <p:0.2> No seats, no doors, no second pilot. <p:0.2> Just you, the sky, and a firm handshake on departure. <p:0.2> PlummetAir, you'll land somewhere!", "[question-en] Flying somewhere? <p:0.2> PlummetAir gets you there for nine dollars! <p:0.2> No seats, no doors, no second pilot. <p:0.2> Just you, the sky, and a firm handshake on departure. <p:0.2> PlummetAir, you'll land somewhere!"),
],
'ad-pureish': [
  ("Thirsty? <p:0.2> Pureish bottled water is sourced from a genuine puddle behind the plant! <p:0.2> Crisp, refreshing, and full of surprises. <p:0.2> Pureish, it's mostly water!", "[question-en] Thirsty? <p:0.2> Pureish bottled water is sourced from a genuine puddle behind the plant! <p:0.2> Crisp, refreshing, and full of surprises. <p:0.2> Pureish, it's mostly water!"),
],
'ad-renta-guard': [
  ("Feeling unsafe? <p:0.2> RentaGuard sends a discount bodyguard to your door in minutes! <p:0.2> He's large, he's loyal-ish, he's mostly sober. <p:0.2> RentaGuard, he'll probably take the hit!", "[question-en] Feeling unsafe? <p:0.2> RentaGuard sends a discount bodyguard to your door in minutes! <p:0.2> He's large, he's loyal-ish, he's mostly sober. <p:0.2> RentaGuard, he'll probably take the hit!"),
],
'ad-rugcoin': [
  ('Missed crypto? <p:0.2> RugCoin is the next big thing until approximately Thursday! <p:0.2> Buy in now, retire by lunch, panic by dinner. <p:0.2> RugCoin, to the moon and slightly past it!', '[question-en] Missed crypto? <p:0.2> RugCoin is the next big thing until approximately Thursday! <p:0.2> Buy in now, retire by lunch, panic by dinner. <p:0.2> RugCoin, to the moon and slightly past it!'),
],
'ad-skybury': [
  ('Lost a loved one? <p:0.2> SkyBury launches them into the heavens via our affordable delivery drone! <p:0.2> Eco-friendly, mostly accurate. <p:0.2> SkyBury, ashes to airspace!', '[question-en] Lost a loved one? <p:0.2> SkyBury launches them into the heavens via our affordable delivery drone! <p:0.2> Eco-friendly, mostly accurate. <p:0.2> SkyBury, ashes to airspace!'),
],
'ad-spincinerate': [
  ('Tired of dieting? <p:0.2> Strap into the home centrifuge that spins the fat clean off your bones in ten seconds flat! <p:0.2> Spincinerate. Get thin in a spin!', '[question-en] Tired of dieting? <p:0.2> Strap into the home centrifuge that spins the fat clean off your bones in ten seconds flat! <p:0.2> Spincinerate. Get thin in a spin!'),
],
'ad-splitsville': [
  ('Marriage not working? <p:0.2> The SplitsVille Kit ends it in minutes, no lawyer required! <p:0.2> Just add signatures and resentment. <p:0.2> Comes with two boxes for your stuff. <p:0.2> SplitsVille, conscious uncoupling, unconscious pricing!', '[question-en] Marriage not working? <p:0.2> The SplitsVille Kit ends it in minutes, no lawyer required! <p:0.2> Just add signatures and resentment. <p:0.2> Comes with two boxes for your stuff. <p:0.2> SplitsVille, conscious uncoupling, unconscious pricing!'),
],
'ad-sue-per-saver': [
  ("Been wronged? <p:0.2> Sue-Per Saver sues anyone for nineteen dollars! <p:0.2> No case too weak, no target too random. <p:0.2> We'll sue the sky if you point at it. <p:0.2> Sue-Per Saver, litigate everything!", "[question-en] Been wronged? <p:0.2> Sue-Per Saver sues anyone for nineteen dollars! <p:0.2> No case too weak, no target too random. <p:0.2> We'll sue the sky if you point at it. <p:0.2> Sue-Per Saver, litigate everything!"),
],
'ad-sugar-be-gone': [
  ('Insulin too pricey? <p:0.2> SugarBeGone is the affordable alternative brewed in a real garage! <p:0.2> Same idea, different everything. <p:0.2> SugarBeGone, probably insulin-adjacent!', '[question-en] Insulin too pricey? <p:0.2> SugarBeGone is the affordable alternative brewed in a real garage! <p:0.2> Same idea, different everything. <p:0.2> SugarBeGone, probably insulin-adjacent!'),
],
'ad-swole-patrol': [
  ('Want gains? <p:0.2> Swole Patrol is the discount gym with no rules, no staff, and one extremely heavy rock! <p:0.2> Lift the rock. <p:0.2> Become the rock. <p:0.2> Swole Patrol, lift or perish!', '[question-en] Want gains? <p:0.2> Swole Patrol is the discount gym with no rules, no staff, and one extremely heavy rock! <p:0.2> Lift the rock. <p:0.2> Become the rock. <p:0.2> Swole Patrol, lift or perish!'),
],
'ad-synapse-surge': [
  ("Brain too quiet? <p:0.2> One sip of Synapse Surge grows a second brain that finishes tomorrow's work today! <p:0.2> Synapse Surge. Think louder.", "[question-en] Brain too quiet? <p:0.2> One sip of Synapse Surge grows a second brain that finishes tomorrow's work today! <p:0.2> Synapse Surge. Think louder."),
],
'ad-toothy': [
  ("Got a toothache? <p:0.2> Toothy's Discount Dental pulls ALL your teeth for the price of one! <p:0.2> No appointment, no anesthetic, no questions. <p:0.2> Toothy's, we'll find the bad one eventually!", "[question-en] Got a toothache? <p:0.2> Toothy's Discount Dental pulls ALL your teeth for the price of one! <p:0.2> No appointment, no anesthetic, no questions. <p:0.2> Toothy's, we'll find the bad one eventually!"),
],
}

base = 'Website/src/data/radio'
total_matched = 0
not_found = []

for slug, pairs in changes.items():
    path = f'{base}/{slug}.json'
    if not os.path.exists(path):
        print(f'FILE MISSING: {slug}')
        continue
    data = json.load(open(path, encoding='utf-8'))
    matched = 0
    for line in data['lines']:
        for old, new in pairs:
            if line['text'] == old:
                line['text'] = new
                line['audio'] = ''
                line['timestamp'] = 0
                line['duration'] = 0
                matched += 1
    json.dump(data, open(path, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    total_matched += matched
    # check which old strings were not found
    reloaded = json.load(open(path, encoding='utf-8'))
    all_texts = {l['text'] for l in reloaded['lines']}
    for old, new in pairs:
        if old not in all_texts and new not in all_texts:
            not_found.append(f'{slug}: {repr(old[:70])}')

print(f'Total applied: {total_matched}')
if not_found:
    print(f'NOT FOUND ({len(not_found)}):')
    for x in not_found:
        print(f'  {x}')
else:
    print('All lines matched.')
