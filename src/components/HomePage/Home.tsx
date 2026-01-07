import React from 'react';
import './Home.css';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

interface EBoardMember {
  name: string;
  position: string;
  major: string;
  personPhoto: string;
  flagPhoto: string;
}

const Home: React.FC = () => {
  // Scroll animation hooks for different sections
  const titleAnim = useScrollAnimation();
  const aboutAnim = useScrollAnimation();
  const missionAnim = useScrollAnimation();
  const eboardAnim = useScrollAnimation();
  
  const eBoardMembers: EBoardMember[] = [
    {
      name: "Andile Khumalo",
      position: "Co-president",
      major: "Mathematics/ Statistics '26",
      personPhoto: "/images/eboard/And-photo.png",
      flagPhoto: "/images/eboard/south-african-flag.jpeg"
    },
    {
      name: "Colin J. Emmanuel",
      position: "Co-president",
      major: "Computer Science '26",
      personPhoto: "/images/eboard/Col-photo.png",
      flagPhoto: "/images/eboard/tanzania-flag.jpeg"
    },
    {
      name: "Eunice Akoth",
      position: "Vice President",
      major: "Political Science/Human Rights '26",
      personPhoto: "/images/eboard/Eun-photo.png",
      flagPhoto: "/images/eboard/kenya-flag.jpeg"
    },
    {
      name: "Fatoumata Gaku",
      position: "Research and Forum Chair",
      major: "Psychology/Africana studies '27",
      personPhoto: "/images/eboard/FatG-photo.png",
      flagPhoto: "/images/eboard/gambia-flag.jpeg"
    },
    {
      name: "Anjelica Young",
      position: "Treasurer",
      major: "Neuroscience '28",
      personPhoto: "/images/eboard/Anj-photo.png",
      flagPhoto: "/images/eboard/kenya-flag2.jpeg"
    },
    {
      name: "Fatoumata Niangadou",
      position: "Research Chair",
      major: "Economics '27",
      personPhoto: "/images/eboard/fatoumata-niangadou-photo.png",
      flagPhoto: "/images/eboard/Mali2-flag.jpeg"
    },
    {
      name: "Ebebe Lionel",
      position: "Secretary",
      major: "Computer Science '27",
      personPhoto: "/images/eboard/Lio-photo.png",
      flagPhoto: "/images/eboard/cameroon-flag.jpeg"
    },
    {
      name: "Rokhiyatou Diawara",
      position: "Research Chair",
      major: "Sociology '27",
      personPhoto: "/images/eboard/Rok-photo.png",
      flagPhoto: "/images/eboard/senegal-flag.jpeg"
    },
    {
      name: "Victoria Afolabi",
      position: "Public Relations Chair",
      major: "Economics/Political Science '27",
      personPhoto: "/images/eboard/Vic-photo.png",
      flagPhoto: "/images/eboard/nigeria-flag.jpeg"
    }
  ];

  return (
    <div className="home-content">
      <div
        ref={titleAnim.elementRef}
        className={`animate-on-scroll fade-in ${titleAnim.isVisible ? 'is-visible' : ''}`}
      >
        <h1 className="main-title">African Development Group</h1>
      </div>
      
      <section
        ref={aboutAnim.elementRef}
        className={`about-section animate-on-scroll slide-up ${aboutAnim.isVisible ? 'is-visible' : ''}`}
      >
        <div className="section-content">
          <div className="text-content">
            <h2 className="section-header about-header">ABOUT US</h2>
            <p className="section-text">
              ADG is a dynamic group of passionate youths dedicated to educating people and 
              creating awareness about the various ways we can adopt to better the African continent. 
              Founded in 2016, we believe that meaningful change begins with education and informed 
              action. Our organization serves as a platform for young voices committed to addressing 
              the political and socioeconomic challenges facing Africa today. Through engaging discussions, 
              educational initiatives, and community outreach, we work to empower individuals with the 
              knowledge and tools necessary to contribute to positive transformation across the continent. 
              We are not afraid to call out corruption and advocate for transparency, accountability, 
              and good governance in all sectors of society.
            </p>
          </div>
          <div className="image-container">
            <img 
              src="https://images.pexels.com/photos/4715519/pexels-photo-4715519.jpeg" 
              alt="African youth"
            />
          </div>
        </div>
      </section>

      <div className="separator">
        <hr />
      </div>

      <section
        ref={missionAnim.elementRef}
        className={`mission-section animate-on-scroll slide-up ${missionAnim.isVisible ? 'is-visible' : ''}`}
      >
        <div className="section-content">
          <div className="image-container">
            <img 
              src="https://media.istockphoto.com/id/537311780/photo/unity-of-indian-children-asia.jpg?b=1&s=612x612&w=0&k=20&c=a_G_fs077szgwZCc8LWScf6rw0ozuJVJgfDP1M5b2MQ=" 
              alt="Community gathering"
            />
          </div>
          <div className="text-content">
            <h2 className="section-header mission-header">OUR MISSION</h2>
            <p className="section-text">
              To empower and educate young people about Africa's potential while fostering critical 
              thinking and active citizenship. We strive to create a generation of informed leaders 
              who are equipped with the knowledge, passion, and determination to drive sustainable 
              development across the African continent. Through educational programs, awareness campaigns, 
              and advocacy initiatives, we aim to bridge the gap between knowledge and action, inspiring 
              youth to become catalysts for positive change in their communities and beyond. Our mission 
              is to cultivate a culture of transparency, accountability, and ethical leadership that will 
              shape Africa's future.
            </p>
          </div>
        </div>
      </section>

      <div className="separator">
        <hr />
      </div>

      <section
        ref={eboardAnim.elementRef}
        className={`eboard-section animate-on-scroll slide-up ${eboardAnim.isVisible ? 'is-visible' : ''}`}
      >
        <h2 className="section-header eboard-title">E-BOARD</h2>
        <div className="eboard-grid">
          {eBoardMembers.map((member, index) => (
            <div
              key={index}
              className={`eboard-member animate-on-scroll slide-up delay-${Math.min((index + 1) * 100, 500)} ${eboardAnim.isVisible ? 'is-visible' : ''}`}
            >
              <img src={member.flagPhoto} alt={`${member.name} flag`} className="flag-image" />
              <img src={member.personPhoto} alt={member.name} className="profile-image" />
              <img src="/images/ADG-logo2.JPG" alt="ADG logo" className="adg-logo" />
              <div className="member-profile">
                <h3 className="member-position">{member.position}</h3>
                <h2 className="member-name">{member.name}</h2>
              </div>
              <div className="member-major">
                <p>{member.major}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;