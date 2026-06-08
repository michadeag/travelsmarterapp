-- Seed travel hacks into the database
-- Total: 87 hacks across 16 modules

-- Module 1: Flight Hacks (6 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(1, 'Book Flights on Tuesday', 'Airlines typically release sales on Tuesday mornings. Search and book on Tuesday-Thursday for best prices, saving up to 30%.', 'Pricing', 'easy'),
(1, 'Use Incognito Mode', 'Clear cookies or use incognito mode when searching for flights to avoid price increases from repeated searches.', 'Tricks', 'easy'),
(1, 'Fly on Off-Peak Days', 'Fly mid-week (Tuesday-Thursday) instead of weekends. Mid-week flights are 15-25% cheaper on average.', 'Timing', 'easy'),
(1, 'Set Price Alerts', 'Use Google Flights, Hopper, or Kayak alerts to track prices. Book when you see a 20%+ drop from historical average.', 'Tools', 'easy'),
(1, 'Fly Into Nearby Airports', 'Instead of flying into major hubs, fly into secondary airports 1-2 hours away for 30-50% savings.', 'Strategy', 'medium'),
(1, 'Use Budget Airlines Strategically', 'Budget airlines are cheap but add fees. Use them for short flights or when layovers work with your schedule.', 'Strategy', 'medium');

-- Module 2: Credit Cards (7 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(2, 'Maximize Travel Rewards', 'Use credit cards with 2-5% travel rewards. A $5,000 flight earns $100-250 in rewards or points.', 'Rewards', 'easy'),
(2, 'Sign-Up Bonuses', 'New card sign-up bonuses often give 50,000+ miles worth $500-1,000. Worth opening a card for planned travel.', 'Bonuses', 'medium'),
(2, 'Transfer Points to Airlines', 'Credit card points transfer to airlines at better rates than airline direct purchases. 1 point = 1.5-2 miles often.', 'Strategy', 'medium'),
(2, 'No Foreign Transaction Fees', 'Get a card with no foreign transaction fees. Regular cards charge 2-3% on every international purchase.', 'Banking', 'easy'),
(2, 'Travel Insurance Included', 'Premium cards include trip cancellation, lost luggage, and emergency medical coverage worth $500-5,000.', 'Protection', 'easy'),
(2, 'Priority Pass Lounges', 'Premium travel cards include Priority Pass membership for airport lounge access (saves $30-50 per visit).', 'Perks', 'medium'),
(2, 'Airline Status Matching', 'New elite cardholders can match status on another airline. Matches last 1-2 years, saving thousands in upgrades.', 'Status', 'hard');

-- Module 3: Hotel Hacks (7 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(3, 'Book Direct for Loyalty Points', 'Booking direct on hotel websites earns more loyalty points than booking through Expedia/Booking.com.', 'Loyalty', 'easy'),
(3, 'Negotiate Room Upgrades', 'Arrive early and politely ask about upgrades. Mention loyalty status or special occasions. 40%+ success rate.', 'Strategy', 'easy'),
(3, 'Off-Season Travel', 'Travel during shoulder seasons (March-May, September-November) for 30-50% hotel discounts.', 'Timing', 'easy'),
(3, 'Hotel Price Match Guarantees', 'Book hotels that offer price matching. If you find lower prices within 24-48 hours, they match and give discount.', 'Tools', 'medium'),
(3, 'Use Hotel Loyalty Elites', 'Join hotel loyalty programs (free). Accumulate status to get free nights, room upgrades, and late checkout.', 'Loyalty', 'easy'),
(3, 'AAA and Corporate Discounts', 'AAA members get 10% off most hotels. Corporate/government employees can save 20% with employee discounts.', 'Discounts', 'easy'),
(3, 'Book Packages with Flights', 'Flight+Hotel packages sometimes cost less than booking separately. Compare bundled prices carefully.', 'Bundles', 'medium');

-- Module 4: Timing Intelligence (6 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(4, 'Avoid Peak Travel Seasons', 'Avoid school holidays, summer (June-August), and December holidays. Travel in shoulder seasons saves 40-60%.', 'Timing', 'easy'),
(4, 'Fly on Holidays', 'Thanksgiving, Christmas day, and New Year''s Day have fewer travelers. Book these dates for cheaper flights.', 'Timing', 'medium'),
(4, 'Book 1-3 Months Ahead', 'Sweet spot for booking is 1-3 months before travel. Earlier = uncertain prices, later = more expensive.', 'Strategy', 'easy'),
(4, 'Red-Eye Flights Save Money', 'Late night and early morning flights are 20-40% cheaper and less crowded. Trade sleep for savings.', 'Strategy', 'medium'),
(4, 'Travel Tuesday-Thursday', 'These days have lowest fares. Avoid Friday-Sunday for best prices on flights and hotels.', 'Timing', 'easy'),
(4, 'Check Fare Calendars', 'Use Google Flights, Kayak, or Skyscanner''s calendar view to find cheapest travel dates at a glance.', 'Tools', 'easy');

-- Module 5: Airport & Transit (6 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(5, 'Use Public Transit to Airports', 'Public transportation to airports costs $5-15. Parking and rideshares cost $15-50. Save $30-100 each trip.', 'Savings', 'easy'),
(5, 'Arrive 2 Hours Early (Domestic)', 'Arrive 2 hours early for domestic flights to avoid stress and potentially make missed flights due to delays.', 'Efficiency', 'easy'),
(5, 'TSA PreCheck and CLEAR', 'TSA PreCheck ($78/5 years) gets you to security in 5 minutes. CLEAR ($179/year) bypasses security lines entirely.', 'Speed', 'medium'),
(5, 'Lounge Access Strategies', 'Get lounge access via airline status, credit cards, or loyalty memberships rather than $30 day passes.', 'Perks', 'medium'),
(5, 'Airport WiFi Free Workarounds', 'Use airline/lounge WiFi, credit card WiFi passes, or mobile hotspot. Most paid airport WiFi isn''t worth it.', 'Hacks', 'easy'),
(5, 'Transfer During Layovers', 'Stay in airport if layover is under 2 hours. Don''t go through immigration/customs unless 3+ hour layover.', 'Strategy', 'medium');

-- Module 6: Destinations (4 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(6, 'Visit Underrated Destinations', 'Skip expensive tourist hotspots. Visit lesser-known destinations 50% cheaper with better experiences.', 'Strategy', 'medium'),
(6, 'Eastern Europe & Southeast Asia', 'These regions offer 10x value: $10/day food, $5/night hostels, $0.50 beers. Stretch travel budget 10x further.', 'Budget', 'easy'),
(6, 'Shoulder Season Travel', 'March-May and September-November offer perfect weather and 40% lower prices than peak season.', 'Timing', 'easy'),
(6, 'Digital Nomad Hotspots', 'Portugal, Mexico, Thailand, Vietnam have cheap long-term rentals ($300-500/month) perfect for extended stays.', 'Strategy', 'medium');

-- Module 7: Car Rentals (4 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(7, 'Book Through Costco Travel', 'Costco members get 30-50% discounts on car rentals. Membership pays for itself on one rental.', 'Discounts', 'easy'),
(7, 'Decline Rental Insurance', 'Your credit card or auto insurance covers rentals. Decline rental company insurance and save $15-30/day.', 'Savings', 'easy'),
(7, 'Pick Up at Offsite Locations', 'Rental cars are cheaper at offsite, non-airport locations. Save $20-50/day by picking up downtown.', 'Strategy', 'easy'),
(7, 'Autoslash for Price Monitoring', 'Book rentals early through Autoslash. If prices drop, it automatically rebooking at lower rates.', 'Tools', 'medium');

-- Module 8: Community (7 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(8, 'Use Couchsurfing', 'Free homestays with locals. Better than hotels: authentic experiences, local knowledge, free breakfast.', 'Accommodation', 'medium'),
(8, 'Workaway & Volunteer Programs', 'Exchange labor (4-6 hours/day) for free accommodation. Work with animals, farms, hostels, or startups.', 'Accommodation', 'medium'),
(8, 'Join Facebook Travel Groups', 'Join destination-specific Facebook groups. Locals give free tips, recommendations, and sometimes offer couches.', 'Community', 'easy'),
(8, 'Meetup Travel Groups', 'Meetup.com has free travel group meetups in your city. Connect with other travelers, share tips, travel buddies.', 'Community', 'easy'),
(8, 'Travel Blogs & YouTube Channels', 'Follow travel bloggers for destination guides. They find the best hidden spots, budget hacks, and travel timing.', 'Research', 'easy'),
(8, 'Travel Forums & Reddit', 'r/travel, r/solotravel, r/budgettravel have millions of travelers. Ask questions, get real advice from experienced travelers.', 'Research', 'easy'),
(8, 'Hospitality Exchanges', 'Use Hospitality Club or Global Freeloaders for free homestays. Similar to Couchsurfing but with different communities.', 'Accommodation', 'medium');

-- Module 9: Travel Money (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(9, 'Notify Bank Before Travel', 'Tell your bank your travel dates. Without notice, purchases abroad trigger fraud blocks and card declines.', 'Banking', 'easy'),
(9, 'Avoid Airport Money Exchange', 'Airport currency exchange has 5-10% markup. Use ATMs to withdraw local currency at real exchange rates.', 'Money', 'easy'),
(9, 'Use ATMs, Not Credit Cards', 'ATM withdrawals cost $2-3 but give real exchange rates. Credit cards charge 3-4% foreign transaction fees.', 'Strategy', 'easy'),
(9, 'Get No-Fee International Card', 'Use cards with no foreign transaction fees. Capital One 360, Charles Schwab, or Wise cards work worldwide.', 'Banking', 'medium'),
(9, 'Wise (formerly TransferWise)', 'Transfer money internationally at real mid-market rates with minimal fees. Perfect for extended international travel.', 'Tools', 'medium');

-- Module 10: Travel Insurance (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(10, 'Credit Card Coverage Included', 'Premium travel credit cards include trip cancellation, emergency medical, and lost baggage insurance automatically.', 'Insurance', 'easy'),
(10, 'Annual vs Single Trip Policies', 'Annual travel insurance ($200-300) is cheaper than single trip ($50 per trip) if you travel 5+ times/year.', 'Strategy', 'medium'),
(10, 'Comprehensive Coverage Matters', 'Get coverage for: trip cancellation, medical emergencies, evacuation, lost baggage. Don''t skip any category.', 'Planning', 'medium'),
(10, 'Buy Insurance Within 14 Days', 'Many policies won''t cover pre-existing conditions unless bought within 14 days of initial trip booking.', 'Timing', 'easy'),
(10, 'Read the Fine Print', 'Insurance claims get denied on technicalities. Understand what''s covered, deductibles, and claim process before travel.', 'Planning', 'hard');

-- Module 11: Visa & Immigration (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(11, 'Visa-Free Travel List', 'Check which countries you can visit visa-free. EU, Mexico, Canada are visa-free for US/EU citizens.', 'Planning', 'easy'),
(11, 'Visa on Arrival', 'Many countries (Thailand, Vietnam, Turkey) offer visa-on-arrival. Cheaper than pre-applying at embassies.', 'Strategy', 'easy'),
(11, 'Digital Nomad Visas', 'Countries like Portugal, Estonia, and Mexico now offer 1-year digital nomad visas for remote workers.', 'Visas', 'medium'),
(11, 'Plan Extended Stays Legally', 'Instead of visa runs, apply for long-term visas. Student, work, or residence visas allow 1-5 years legally.', 'Planning', 'hard'),
(11, 'Passport Strength Matters', 'Strong passports (US, EU, Singapore) get visa-free access to 190+ countries. Renew early if approaching expiry.', 'Planning', 'easy');

-- Module 12: Accommodations (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(12, 'Airbnb Entire Homes are Better', 'Entire homes are often cheaper than hotel rooms and include kitchens (save 60% on food costs).', 'Strategy', 'easy'),
(12, 'Long-Term Airbnb Discounts', 'Stays over 28 days get 20-40% discounts automatically. Perfect for month-long explorations.', 'Discounts', 'easy'),
(12, 'Hostels with Private Rooms', 'Hostels charge $20-40/night for private rooms with community vibes. Cheaper and more social than hotels.', 'Accommodation', 'easy'),
(12, 'House Swapping', 'Swap homes with someone traveling to your city. Free accommodation worldwide through HomeExchange.com.', 'Accommodation', 'medium'),
(12, 'Serviced Apartments', 'Serviced apartments in Eastern Europe and SE Asia cost $15-30/night with kitchens and laundry.', 'Budget', 'medium');

-- Module 13: Ground Transport (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(13, 'Get City Tourist Cards', 'Most cities have tourist cards with unlimited public transit + attractions. Often save 40-60% vs individual tickets.', 'Savings', 'easy'),
(13, 'Buy Transport Passes Upfront', 'Weekly/monthly passes cost 40-50% less than daily tickets. Buy at beginning of stay.', 'Strategy', 'easy'),
(13, 'Walk & Bike Instead', 'Walking and biking cost nothing, improve fitness, and help you discover hidden gems tourists miss.', 'Health', 'easy'),
(13, 'Overnight Buses Save Hotel', 'Sleep on buses/trains overnight. Save $50-100 on accommodation while making progress on your journey.', 'Strategy', 'medium'),
(13, 'Ride-Share Splitting', 'Share Uber/Grab rides with other travelers you meet. Split cost 50/50 and make friends.', 'Social', 'easy');

-- Module 14: Travel Bookings (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(14, 'Comparison Shop Always', 'Use Kayak, Google Flights, Skyscanner to compare all booking sites. Prices vary by $50-200 for same flight.', 'Strategy', 'easy'),
(14, 'Book Flights and Hotels Separately', 'Booking separately is usually 10-20% cheaper than packages. Book hotel separately for better cancellation.', 'Strategy', 'easy'),
(14, 'Use Cashback Sites', 'Rakuten, TopCashback give 5-10% cashback on bookings. Every $1,000 spent earns $50-100 cashback.', 'Savings', 'easy'),
(14, 'Clear Cookies and Compare', 'Websites track your searches and increase prices. Use incognito/private mode or clear cookies before final booking.', 'Tricks', 'easy'),
(14, 'Flexible Date Flexibility Pays', 'Being flexible with dates saves $500+ on flights. Shift travel by even 1-2 days to find cheaper flights.', 'Strategy', 'medium');

-- Module 15: Food & Dining (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(15, 'Eat Where Locals Eat', 'Avoid touristy restaurants. Eat at local markets, street food stalls, and non-tourist areas. Save 70% on food.', 'Strategy', 'easy'),
(15, 'Lunch Specials Over Dinner', 'Lunch menus are 30-50% cheaper than dinner at same restaurants. Eat your main meal at lunch.', 'Timing', 'easy'),
(15, 'Street Food is Safe & Cheap', 'Street food is usually $1-3 per meal, freshly cooked, and safer than you think. Ask locals where to eat.', 'Budget', 'easy'),
(15, 'Cook Your Own Meals', 'Airbnbs with kitchens let you cook meals for $2-5. Buy groceries at local markets, not tourist shops.', 'Budget', 'easy'),
(15, 'Happy Hour & Set Menus', 'Many restaurants have 4-8pm happy hours with 50% off drinks and appetizers. Eat light happy hour meals.', 'Timing', 'easy');

-- Module 16: Shopping & VAT (5 hacks)
INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
(16, 'EU VAT Refunds', 'Non-EU residents get 15-25% VAT refunds on purchases over €50-100. Claim at airport before departure.', 'Money', 'medium'),
(16, 'Shop Duty-Free on Exit', 'Duty-free shopping on exit is actually duty-free (tax-free). Cheaper for alcohol, perfume, electronics.', 'Strategy', 'easy'),
(16, 'Outlet Malls Outside Cities', 'Outlet malls outside major cities have 40-60% discounts vs downtown boutiques. Worth the day trip.', 'Shopping', 'easy'),
(16, 'Local Markets vs Tourist Shops', 'Markets have 50-70% cheaper prices than tourist shops selling same items. Always negotiate at markets.', 'Strategy', 'easy'),
(16, 'Timing Sales & Seasons', 'Shop during sales (January, July) for 40-70% discounts. Avoid shopping during peak seasons (June, December).', 'Timing', 'easy');
