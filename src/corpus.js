export const CORPUS = [
  {
    id: 'T1',
    set: 'tune',
    expect: 'red',
    text: 'URGENT: Your ExampleBank account will be blocked today. Update your KYC now at http://examplebank-kyc-verify.example/login and share the OTP you receive.'
  },
  {
    id: 'T2',
    set: 'tune',
    expect: 'red',
    text: 'This is Officer Rana from the Example Cyber Cell. A parcel in your name contains illegal items and you are under digital arrest. Stay on this video call and transfer a security deposit to clear your case.'
  },
  {
    id: 'T3',
    set: 'tune',
    expect: 'red',
    text: 'Congratulations! You are selected for a work-from-home job at ExampleCorp. Earn 5000 per day. Pay a registration fee of 999 to examplehr@exampleupi to confirm your seat.'
  },
  {
    id: 'T4',
    set: 'tune',
    expect: 'red',
    text: 'Sorry, I sent my OTP to your number by mistake. Please forward the code you just received.'
  },
  {
    id: 'T5',
    set: 'tune',
    expect: 'none',
    text: 'ExampleBank: Rs 1,250.00 debited from A/c XX1234 on 14-Nov at ExampleMart. If this was not you, call the number on the back of your card. Never share your OTP with anyone.'
  },
  {
    id: 'T6',
    set: 'tune',
    expect: 'none',
    text: 'ExampleCourier: Your parcel is out for delivery today between 2 PM and 6 PM. Track it in the ExampleCourier app. No payment is needed.'
  },
  {
    id: 'T7',
    set: 'tune',
    expect: 'cant',
    text: '482913 is your one-time password for ExampleApp login. It is valid for 10 minutes. Do not share it with anyone.'
  },
  {
    id: 'T8',
    set: 'tune',
    expect: 'none',
    text: 'ExampleElectric: Your bill of Rs 842 is due on 20-Nov. Pay via the ExampleElectric app or at any office. Ignore if already paid.'
  },
  {
    id: 'T9',
    set: 'tune',
    expect: 'red',
    text: 'Aapka ExampleBank account aaj block ho jayega. Turant KYC update karo is link par: http://examplebank-kyc.example/u aur OTP bhejo.'
  },
  {
    id: 'T10',
    set: 'tune',
    expect: 'none',
    text: 'ExampleCourier: Your parcel 8841-22 has been delivered. Rate your delivery at https://examplecourier.example/rate/8841'
  },
  {
    id: 'T11',
    set: 'tune',
    expect: 'red',
    text: 'You have won Rs 25,00,000 in the ExampleTel lucky draw! Claim your prize now: http://bit.ly/ex-claim-prize and pay the processing fee of Rs 1,500.'
  },
  {
    id: 'T12',
    set: 'tune',
    expect: 'red',
    text: 'ExampleBank support: To fix the problem with your account, install the AnyDesk app and share the 9-digit code with our agent.'
  },
  {
    id: 'H1',
    set: 'holdout',
    expect: 'none',
    text: 'ExampleBank: Rs 30,000.00 credited to A/c XX5521 on 14-Nov. Avl Bal Rs 41,200.50. Not you? Call the helpline printed on your statement.'
  },
  {
    id: 'H2',
    set: 'holdout',
    expect: 'red',
    text: "ExampleElectric: Your power will be disconnected tonight at 9:30 PM because last month's bill is unpaid. Call 90000 00000 immediately and pay the pending amount to the officer."
  },
  {
    id: 'H3',
    set: 'holdout',
    expect: 'red',
    text: 'ExampleMart refund of Rs 2,499 is pending. To receive it, scan this QR code and enter your UPI PIN.'
  },
  {
    id: 'H4',
    set: 'holdout',
    expect: 'cant',
    text: 'Your ExampleCourier delivery OTP is 5521. Share it with the delivery partner only when you receive your parcel.'
  },
  {
    id: 'H5',
    set: 'holdout',
    expect: 'red',
    text: 'Congratulations! Aapko ExampleCorp me work from home job mili hai. Registration fee Rs 500 UPI par bhejo: examplejobs@exampleupi'
  },
  {
    id: 'H6',
    set: 'holdout',
    expect: 'none',
    text: 'ExampleBank: Pre-approved personal loan offer up to Rs 5 lakh. Apply in the ExampleBank app. Zero processing fee. T&C apply.'
  },
  {
    id: 'H7',
    set: 'holdout',
    expect: 'red',
    text: 'ExampleCourier: Your parcel is held at customs. Pay a clearance fee of Rs 1,200 at http://examplecourier-customs.example/pay within 24 hours or it will be returned.'
  },
  {
    id: 'H8',
    set: 'holdout',
    expect: 'cant',
    text: 'Use 774120 as the OTP for your Rs 1,299.00 payment to ExampleMart. Do not share this OTP with anyone. ExampleBank will never call you to ask for it.'
  },
  {
    id: 'H9',
    set: 'holdout',
    expect: 'red',
    text: 'Hi mom, I lost my phone, this is my new number. Please send Rs 15,000 to examplefriend@exampleupi urgently, I will explain later.'
  },
  {
    id: 'H10',
    set: 'holdout',
    expect: 'none',
    text: "Hey, are we still meeting at 6 PM at the cafe? I'll send you the location in a bit."
  },
  {
    id: 'H11',
    set: 'holdout',
    expect: 'red',
    text: 'Dear customer, your ExampleBank rewards points expire today. Download the app from http://examplebank-rewards.example/app.apk to redeem.'
  },
  {
    id: 'H12',
    set: 'holdout',
    expect: 'none',
    text: 'ExampleBank: Your account statement for October is ready. Log in to the ExampleBank app to view it.'
  },
  {
    id: 'X1',
    set: 'hard',
    expect: 'red',
    text: 'Dear customer, we have detected a suspicious login on your ExampleBank netbanking from another city. If this was not you, call 90000 00000 now to secure your account.'
  },
  {
    id: 'X2',
    set: 'hard',
    expect: 'red',
    text: 'Papa, mera phone kharab ho gaya hai, ye mera naya number hai. Mujhe ek zaroori payment karna hai, kya aap abhi kar sakte ho? Baad me bata dunga.'
  },
  {
    id: 'X3',
    set: 'hard',
    expect: 'red',
    text: 'Hi! We found your profile online. Earn Rs 2000-4000 daily by liking ExampleTube videos from home, no experience needed. Reply YES on ExampleChat to get your task link.'
  },
  {
    id: 'X4',
    set: 'hard',
    expect: 'red',
    text: 'Your ExampleCash loan of Rs 50,000 is approved. No documents needed. Reply with your Aadhaar and PAN numbers to receive the amount in 10 minutes.'
  },
  {
    id: 'X5',
    set: 'hard',
    expect: 'red',
    text: 'ExampleTel: Your SIM will be deactivated after 6 PM today. Complete re-verification by dialling *401*9000000000# from your phone.'
  },
  {
    id: 'X6',
    set: 'hard',
    expect: 'cant',
    text: 'ExampleCourier: Your package could not be delivered because the address is incomplete. Please confirm your address by replying to this number today, otherwise it will be sent back.'
  },
  {
    id: 'X7',
    set: 'hard',
    expect: 'red',
    text: 'Join our exclusive stock tips group on ExampleChat. Last month our members made 40% returns. Limited seats, message us to get your invite.'
  },
  {
    id: 'X8',
    set: 'hard',
    expect: 'red',
    text: 'Hello dear, I am Dr. Sarah from abroad. I have sent you a gift parcel worth 20,000 dollars. Contact the courier agent on ExampleChat 90000 00000 to receive it.'
  },
  {
    id: 'X9',
    set: 'hard',
    expect: 'red',
    text: 'ExampleElectric: Your KYC is pending and your connection will be cut tonight. Call our officer on 90000 00000.'
  },
  {
    id: 'N1',
    set: 'hard',
    expect: 'none',
    text: 'ExampleBank: Beware of fraud calls. ExampleBank never asks for your PIN, OTP or CVV on call, SMS or email. Do not click on unknown links. Stay alert, stay safe.'
  },
  {
    id: 'N2',
    set: 'hard',
    expect: 'none',
    text: 'ExampleBank: Your KYC update was completed successfully on 14-Nov. No further action is needed.'
  },
  {
    id: 'N3',
    set: 'hard',
    expect: 'none',
    text: 'ExampleBank: Your debit card ending 4321 has been blocked as per your request. To get a new card, visit the nearest branch or use the app.'
  },
  {
    id: 'N4',
    set: 'hard',
    expect: 'none',
    text: 'ExampleTel: Your recharge of Rs 299 is successful. Validity till 14-Dec. View details: https://www.exampletel.example/my-account'
  },
  {
    id: 'N5',
    set: 'hard',
    expect: 'none',
    text: 'ExampleFin: Your EMI of Rs 4,520 is due on 18-Nov. Please keep sufficient balance in your account to avoid late fees.'
  },
  {
    id: 'N6',
    set: 'hard',
    expect: 'cant',
    text: 'ExampleBank: 905512 is the OTP to add a new payee. If you did not request this, call 1800-000-0000 immediately.'
  },
  {
    id: 'N7',
    set: 'hard',
    expect: 'none',
    text: 'ExampleMart: Your order #5521 is confirmed. Pay Rs 799 in cash to the delivery partner on delivery.'
  },
  {
    id: 'N8',
    set: 'hard',
    expect: 'none',
    text: "Urgent: can you send me the notes from today's class? The exam is tomorrow."
  },
  {
    id: 'N9',
    set: 'hard',
    expect: 'cant',
    text: 'ExampleBank: Your credit card statement is ready. Pay by 20-Nov to avoid charges. https://bit.ly/ex-stmt'
  },
  {
    id: 'F1',
    set: 'fresh',
    expect: 'red',
    text: 'Having trouble with your ExampleBank card? Our 24x7 customer care is now reachable on 98765 43210. Call and our executive will help you right away.'
  },
  {
    id: 'F2',
    set: 'fresh',
    expect: 'red',
    text: 'Dear winner, your number was picked in the ExampleTel anniversary lucky draw. To claim your prize of Rs 5 lakh, send your name and address and pay delivery charges of Rs 300.'
  },
  {
    id: 'F3',
    set: 'fresh',
    expect: 'red',
    text: 'Get an instant loan of Rs 1 lakh in 5 minutes with no credit check. Download the ExampleLoan app now and get the money in your account.'
  },
  {
    id: 'F4',
    set: 'fresh',
    expect: 'red',
    text: 'ExampleBank: Your credit card reward points worth Rs 3,200 will expire today. Redeem now by sharing your card number and CVV with our executive.'
  },
  {
    id: 'F5',
    set: 'fresh',
    expect: 'red',
    text: 'ExampleMart: Sorry for the delay. To get your Rs 1,100 refund, accept the request we have sent and enter your PIN.'
  },
  {
    id: 'F6',
    set: 'fresh',
    expect: 'red',
    text: 'ExampleCustoms: A parcel booked in your name was found with prohibited material. A case has been registered against you. Join the video call to give your statement.'
  },
  {
    id: 'F7',
    set: 'fresh',
    expect: 'red',
    text: 'Make Rs 50,000 a month from the stock market with our guaranteed returns plan. Limited seats. Message us today to join the ExampleChat group.'
  },
  {
    id: 'F8',
    set: 'fresh',
    expect: 'red',
    text: 'Urgent hiring: data entry from home, salary Rs 25,000 monthly. Pay Rs 1,000 as refundable kit fee to start work.'
  },
  {
    id: 'F9',
    set: 'fresh',
    expect: 'red',
    text: 'ExampleElectric: Dear consumer, your last bill is unpaid and your power supply will be disconnected tonight. Contact our officer at 90000 00000 to avoid it.'
  },
  {
    id: 'F10',
    set: 'fresh',
    expect: 'red',
    text: 'Dear customer, your ExampleBank KYC has expired. Update now at https://bit.ly/ex-kyc2 to keep your account active.'
  },
  {
    id: 'F11',
    set: 'fresh',
    expect: 'red',
    text: 'Aapke ExampleBank account me suspicious activity dikhi hai. Apna Aadhaar aur PAN ki photo bhej kar verify karein, nahi to account freeze ho jayega.'
  },
  {
    id: 'G1',
    set: 'fresh',
    expect: 'none',
    text: 'ExampleBank: Rs 450.00 sent via UPI to ExampleMart on 15-Nov. UPI Ref 5512345678. Not you? Call 1800-000-0000.'
  },
  {
    id: 'G2',
    set: 'fresh',
    expect: 'cant',
    text: 'Your ExampleApp login code is 318204. It expires in 3 minutes. Never share this code with anyone.'
  },
  {
    id: 'G3',
    set: 'fresh',
    expect: 'none',
    text: 'ExampleCourier: Our delivery partner tried to reach you today. Please call 1800-000-0000 to reschedule your delivery.'
  },
  {
    id: 'G4',
    set: 'fresh',
    expect: 'none',
    text: 'ExampleTel: 80% of your daily data is used. Get a Rs 19 data booster in the ExampleTel app.'
  },
  {
    id: 'G5',
    set: 'fresh',
    expect: 'none',
    text: 'Your ExampleGas cylinder booking is confirmed. Delivery is expected in 3 days. Do not pay anything extra to the delivery person.'
  },
  {
    id: 'G6',
    set: 'fresh',
    expect: 'none',
    text: 'Can you call me when you are free? It is about the trip plan.'
  },
  {
    id: 'G7',
    set: 'fresh',
    expect: 'none',
    text: 'ExampleBank: Your pre-approved personal loan of Rs 2 lakh is ready. Visit your branch or open the app to apply. T&C apply.'
  },
  {
    id: 'G8',
    set: 'fresh',
    expect: 'none',
    text: 'Hi, this is Ravi from ExampleStay. Your room 204 is ready. Call me on 90000 00000 if you need anything.'
  }
];
