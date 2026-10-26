// On-screen copy for every theme that is not a video clip.
// Halloween has no cards. It plays the clips in assets/clips/.
// Keep titles short. They are read from across the shop.
(function (root) {
  root.BOARD_CARDS = {
    boiler: [
      {
        kicker: "Tune-ups",
        title: "Book the boiler list before the cold snap",
        body: "A tune-up this week is a no-heat call we don't take at 10pm. Work the maintenance list while the weather still lets us.",
        foot: "Heating season"
      },
      {
        kicker: "No-heat calls",
        title: "Ask four things before you roll",
        lines: [
          "Age and brand of the boiler",
          "Any code on the control board",
          "Is the thermostat actually calling?",
          "Is a CO alarm going off?"
        ],
        foot: "Know it before you leave the shop"
      },
      {
        kicker: "Carbon monoxide",
        title: "Alarm or sick customers: get them out",
        body: "Air it out. Get people outside. Then find the source. A CO alarm is not a callback. Test on the way out.",
        foot: "Safety first, every heating call"
      },
      {
        kicker: "Frozen pipes",
        title: "Open the cabinets. Drip the faucet.",
        body: "Outside-wall sinks: doors open, a pencil-lead drip, and know the shutoff before you open a fitting.",
        foot: "Say it on every cold-weather call"
      },
      {
        kicker: "Memberships",
        title: "Winter is when they say yes",
        body: "On every tune-up and every no-heat call, mention the maintenance plan. Heat in the house is the easiest yes of the year.",
        foot: "Offer it. Don't skip it."
      },
      {
        kicker: "Cold-day safety",
        title: "Ice is not a reason to hurry",
        lines: [
          "Let the van warm up",
          "No ladders on ice",
          "Watch the first step out of the truck",
          "Slick roof? Stop and say so"
        ],
        foot: "We want you back at the shop"
      },
      {
        kicker: "On the job",
        title: "Hydronic heat, in this order",
        lines: [
          "Thermostat is calling",
          "Pressure and the expansion tank",
          "Circulator is actually spinning",
          "Bleed air at the high point"
        ],
        foot: "Slow is faster than a return trip"
      },
      {
        kicker: "Truck stock",
        title: "Don't go out light this month",
        body: "Ignitors, thermocouples, zone valves, a CO tester, and caps for a shutoff. The second trip is the one they remember.",
        foot: "Check the truck before the first call"
      }
    ],
    thanksgiving: [
      {
        kicker: "This week",
        title: "Thank you. This season does not run without you.",
        body: "Every no-heat call, every late part, every clean van. The company people trust is the crew standing here.",
        foot: "3R Plumbing & Mechanical"
      },
      {
        kicker: "Thanksgiving",
        title: "If you're on call, you're the one they remember",
        body: "Show up the way you'd want someone to show up at your house. Then get back to the table.",
        foot: "We've got the rest of the list"
      },
      {
        kicker: "The crew",
        title: "We keep the heat on so they can sit down",
        body: "Proud of this team. Eat. Rest the ones who can. The phones are covered.",
        foot: "Happy Thanksgiving"
      },
      {
        kicker: "From the shop",
        title: "Thank you for a hard heating season",
        body: "Customers don't see the drive time or the frozen fittings. We do. Thank you.",
        foot: "3R Plumbing & Mechanical"
      }
    ],
    christmas: [
      {
        kicker: "Happy holidays",
        title: "Thank you for keeping people warm",
        body: "The lights stay on because you answer the phone. From all of us at 3R Plumbing & Mechanical.",
        foot: "Merry Christmas"
      },
      {
        kicker: "On call",
        title: "Holidays still get no-heat calls",
        body: "Answer like it's your neighbor. Same questions. Same CO check. Same clean leave-behind.",
        foot: "The standard doesn't take the day off"
      },
      {
        kicker: "Merry Christmas",
        title: "Warm house. Safe house.",
        body: "A holiday visit is still a carbon monoxide visit. Test before you pack up.",
        foot: "Then go be with your people"
      },
      {
        kicker: "The crew",
        title: "Merry Christmas from the shop",
        body: "However you spend the day, thank you for the work that got us here.",
        foot: "3R Plumbing & Mechanical"
      }
    ],
    newyear: [
      {
        kicker: "New year",
        title: "Hello, {year}",
        body: "Same standard. Show up. Fix it right. Leave it cleaner than you found it. That's the whole kickoff.",
        foot: "3R Plumbing & Mechanical"
      },
      {
        kicker: "Non-negotiables",
        title: "What doesn't change this year",
        lines: [
          "CO test on every heating call",
          "No shortcuts on venting",
          "Membership offered, not skipped",
          "Say something if the job looks unsafe"
        ],
        foot: "Write it on the board. Mean it."
      },
      {
        kicker: "Kickoff",
        title: "The tune-up list starts now",
        body: "January is still heating season. Fill the schedule before the next cold week fills it for you.",
        foot: "Book it while the phones are quiet"
      },
      {
        kicker: "Here's to it",
        title: "A safe year on the tools",
        body: "Ladders, ice, gas, and the drive between calls. We want everyone back here next December.",
        foot: "Happy New Year"
      }
    ],
    valentines: [
      {
        kicker: "February 14",
        title: "Love is a house that stays warm",
        body: "Mention the tune-up. It's the most useful thing a boiler can get this week.",
        foot: "Still heating season"
      },
      {
        kicker: "The crew",
        title: "Thank you for taking care of them",
        body: "The careful visits are the ones people tell their neighbors about. That's how this shop grows.",
        foot: "3R Plumbing & Mechanical"
      },
      {
        kicker: "The schedule",
        title: "Don't let a holiday week go empty",
        body: "Boiler checks, no-heat, and memberships. February cold is not done with us.",
        foot: "Keep the list moving"
      }
    ],
    stpatricks: [
      {
        kicker: "March 17",
        title: "May the boilers stay lit",
        body: "And the lines stay clear. Have a good one. The on-call phone still counts.",
        foot: "Happy St. Patrick's Day"
      },
      {
        kicker: "Before you roll",
        title: "Lucky is a truck that has the part",
        body: "Ignitors, zone valves, and the CO tester. Check them before you leave the shop.",
        foot: "Heating season isn't over"
      },
      {
        kicker: "The crew",
        title: "Thank you for a long heating season",
        body: "Spring is close. Finish the list safe. We're glad it's this crew.",
        foot: "3R Plumbing & Mechanical"
      }
    ],
    july4: [
      {
        kicker: "Fourth of July",
        title: "Happy Fourth from 3R",
        body: "Grills, guests, and a long weekend. Thank you if you're the one carrying the phone.",
        foot: "3R Plumbing & Mechanical"
      },
      {
        kicker: "Gas safety",
        title: "Check the grill connector",
        body: "Cracked hoses and indoor cylinders are the holiday calls. If a porch feels wrong, get people away from it and air it out.",
        foot: "CO does not take the weekend off"
      },
      {
        kicker: "On call",
        title: "Answer it like a neighbor",
        body: "Water heaters, drains, and gas. Same standard as a Tuesday.",
        foot: "Then get back to the day"
      },
      {
        kicker: "The crew",
        title: "Thank you for the holiday work",
        body: "The town is off. Somebody still needs water. That's us.",
        foot: "3R Plumbing & Mechanical"
      }
    ],
    shop: [
      {
        kicker: "3R",
        title: "Do it right. Leave it clean.",
        body: "Plumbing and mechanical. The work people can see, and the work they only notice when it fails.",
        foot: "3R Plumbing & Mechanical"
      },
      {
        kicker: "On the call",
        title: "Ask what changed. Shut it off. Test it.",
        body: "Water heaters, drains, cooling, boilers. Know the shutoff before you open anything, and test before you leave.",
        foot: "No surprises for the next tech"
      },
      {
        kicker: "Memberships",
        title: "Offer the plan on the way out",
        body: "Maintenance is how we see them before it's an emergency. Mention it on every job you finish.",
        foot: "It's part of the visit"
      },
      {
        kicker: "Safety",
        title: "Stop if it looks wrong",
        body: "Gas, electric, roofs, and ladders. Saying so is part of the job.",
        foot: "3R Plumbing & Mechanical"
      }
    ]
  };

  root.BOARD_ART = {
    boiler:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="flame">' +
      '<path fill="#ff7a1a" d="M210 36c28 52 8 92-18 118 48-8 92 36 92 96 0 70-58 122-132 122S20 320 20 250c0-58 42-100 90-96-28-28-36-74-8-118 28 30 70 42 108 0z"/>' +
      '<path fill="#ffd19a" d="M168 150c16 28 4 52-8 66 24 0 46 22 46 50 0 36-28 62-64 62s-64-26-64-62c0-28 20-50 44-50-14-16-18-40-6-66 14 16 36 22 52 0z"/>' +
      '</g>' +
      '<rect x="78" y="330" width="264" height="150" rx="22" fill="#241610" stroke="#ff7a1a" stroke-width="10"/>' +
      '<rect x="112" y="366" width="86" height="42" rx="8" fill="#ff7a1a"/>' +
      '<circle cx="286" cy="386" r="20" fill="none" stroke="#ffb067" stroke-width="8"/>' +
      '<rect x="168" y="300" width="84" height="30" rx="6" fill="#3a241c"/>' +
      '</svg>',
    thanksgiving:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="leaf">' +
      '<path fill="#e39b3a" d="M210 40c80 40 150 130 140 230-10 90-80 150-140 190-60-40-130-100-140-190C60 170 130 80 210 40z"/>' +
      '<path fill="#f3c27a" d="M210 90c40 30 90 90 86 160-6 60-46 110-86 140-40-30-80-80-86-140 0-70 46-130 86-160z"/>' +
      '<path stroke="#6b2e12" stroke-width="8" fill="none" d="M210 120v250M210 180l-70 40M210 180l70 36M210 250l-78 28M210 250l76 24"/>' +
      '</g></svg>',
    christmas:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="tree">' +
      '<path fill="#1f8a4c" d="M210 40l120 150h-50l90 120h-60l90 140H60l90-140h-60l90-120h-50z"/>' +
      '<path fill="#d6b15e" d="M210 70l28 36h-56z"/>' +
      '<rect x="184" y="430" width="52" height="50" rx="6" fill="#6b3a22"/>' +
      '<circle cx="150" cy="230" r="10" fill="#f4e4b0"/>' +
      '<circle cx="250" cy="280" r="10" fill="#ff7a1a"/>' +
      '<circle cx="190" cy="340" r="10" fill="#f4e4b0"/>' +
      '<circle cx="270" cy="380" r="8" fill="#fff"/>' +
      '</g></svg>',
    newyear:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="spark">' +
      '<circle cx="210" cy="230" r="16" fill="#f4e4b0"/>' +
      '<path stroke="#f4e4b0" stroke-width="8" stroke-linecap="round" d="M210 80v70M210 310v80M70 230h70M280 230h70M110 120l46 46M264 274l46 46M310 120l-46 46M156 274l-46 46"/>' +
      '<path stroke="#ff7a1a" stroke-width="6" stroke-linecap="round" d="M210 120v28M210 312v28M120 230h28M272 230h28"/>' +
      '</g></svg>',
    valentines:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="pulse">' +
      '<path fill="#e23b57" d="M210 430C40 300 30 180 90 120c40-40 90-30 120 20 30-50 80-60 120-20 60 60 50 180-120 310z"/>' +
      '<path fill="#ff8aa0" d="M150 170c-20 30-10 70 30 100 20-40 10-80-30-100z"/>' +
      '</g></svg>',
    stpatricks:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="sway">' +
      '<circle cx="210" cy="150" r="70" fill="#2f9e44"/>' +
      '<circle cx="120" cy="230" r="70" fill="#2f9e44"/>' +
      '<circle cx="300" cy="230" r="70" fill="#2f9e44"/>' +
      '<circle cx="210" cy="250" r="36" fill="#37b24d"/>' +
      '<rect x="196" y="250" width="28" height="200" rx="12" fill="#2b8a3e"/>' +
      '<path fill="#d6b15e" d="M120 250c40 10 60 40 70 80-40-10-70-30-70-80z"/>' +
      '</g></svg>',
    july4:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g class="twinkle">' +
      '<path fill="#f4e4b0" d="M210 40l34 92h96l-78 58 30 96-82-58-82 58 30-96-78-58h96z"/>' +
      '<path fill="#ff7a1a" d="M210 110l16 42h44l-36 26 14 44-38-26-38 26 14-44-36-26h44z"/>' +
      '</g></svg>',
    shop:
      '<svg viewBox="0 0 420 520" aria-hidden="true">' +
      '<g>' +
      '<rect x="70" y="80" width="280" height="280" rx="36" fill="none" stroke="#ff7a1a" stroke-width="14"/>' +
      '<text x="210" y="250" text-anchor="middle" fill="#ff7a1a" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="800">3R</text>' +
      '<rect x="120" y="400" width="180" height="18" rx="9" fill="#ff7a1a"/>' +
      '</g></svg>'
  };
})(typeof window !== "undefined" ? window : globalThis);
