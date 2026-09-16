# Project Overview — Powerstation Calculator

There are manyy Portable/Non-Portable power stations in the market belonging
to different Brands such as Anker, EcoFlow, Marsriva, Hithium, Oraimo,
Bluetti, EcoSONIC. But the most questions asked about these are related to
Calculate Load, Estimate Runtime, Determine Solar Recharge Time & AC
Recharge time. This web application answers this question.

## Purpose

To Provide a clear vision to the person who want to buy a power station.
Using this web application will show them whatever they would like to
find within the offered calcs and help the persion to decide the best choice
for him/her.

## Goals

- Can add multiple power stations using Add Power Station Form
- For Each power station user can calculate the formulas given
  in @context/calculation-formulas.md and also include AC Recharge Time
- If and only if all the calcuations are done for each powerstation then the user
  can generate a comparison table and download it as a pdf.
- Keep the codebase simple enough and only use HTML, CSS & Vanilla JS only. No external frameworks and modules.

## Core Features

1. **Calculate Daily Energy Need/Supply**

2. **Runtime on Powerstation**

3. **Solar Recharge Time**

4. **AC Recharge Time**

## Content Strategy

- Allow the user to calculate for each power station and then
  have a comparision table to have a clearer picture

## Constraints & Decisions

- Only use HTML, CSS & Vanilla JS. No framework or external modules
- I will deploy using Cloudflare using wrangler. So add a deploy guide
  in the @context directory.
- The formulas are same for all the power stations. The formulas in @context/calculation-formulas.md are EcoFlow specific, but allow the user to input
  power station specific details in the power station form.
- After power station added user can calc the formulas given in the file. Also
  allow them to calculate the AC Recharge Time
- Each formula can have their own form under a power station
- All the data's should be stored as cookie/localStorage so that the user can see the data
  after he comes back to the site
- The whole application will be under one page. And the multi power stations data can be shown/displayed using tabbed action/style.

## Stack

- HTML
- CSS
- Vanilla JS

## Design

- Follow the @DESIGN.md to design and develop the website.
- Mobile layout is a must
- Must be only one page
