import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

const ArrowMenuIcon = ({
  width = 24,
  height = 24,
  fill = "#5e72e4",
  className = "",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <path
      d="M11.075 4.258c-.79.641-1.282 1.679-1.427 3.367a.75.75 0 1 1-1.495-.13c.165-1.911.753-3.409 1.977-4.402 1.204-.977 2.887-1.353 4.98-1.353h.13c2.31 0 4.121.458 5.337 1.674C21.793 4.629 22.25 6.44 22.25 8.75v6.52c0 2.31-.457 4.121-1.673 5.337S17.55 22.28 15.24 22.28h-.13c-2.078 0-3.75-.37-4.952-1.332-1.223-.978-1.819-2.454-1.994-4.338a.75.75 0 1 1 1.493-.14c.155 1.656.649 2.676 1.438 3.307.811.649 2.074 1.003 4.015 1.003h.13c2.161 0 3.48-.437 4.276-1.234.797-.797 1.234-2.115 1.234-4.276V8.75c0-2.16-.437-3.479-1.234-4.276-.796-.797-2.115-1.234-4.276-1.234h-.13c-1.956 0-3.223.36-4.034 1.018z"
      fill={fill}
    />
    <path
      opacity=".4"
      d="M2.87 12a.75.75 0 0 1 .75-.75H15a.75.75 0 1 1 0 1.5H3.62a.75.75 0 0 1-.75-.75z"
      fill={fill}
    />
    <path
      opacity=".4"
      d="M6.38 8.12a.75.75 0 0 1 0 1.06L3.56 12l2.82 2.82a.75.75 0 1 1-1.06 1.06l-3.35-3.35a.75.75 0 0 1 0-1.06l3.35-3.35a.75.75 0 0 1 1.06 0z"
      fill={fill}
    />
  </svg>
);

const FilterSettingsIcon = ({
  width = 24,
  height = 24,
  fill = "#138d42ff",
  className = "",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 512 512"
    fill={fill}
    className={className}
    {...props}
  >
    <path d="M490.667 405.333h-56.811C424.619 374.592 396.373 352 362.667 352s-61.931 22.592-71.189 53.333H21.333C9.557 405.333 0 414.891 0 426.667S9.557 448 21.333 448h270.144c9.237 30.741 37.483 53.333 71.189 53.333s61.931-22.592 71.189-53.333h56.811c11.797 0 21.333-9.557 21.333-21.333s-9.535-21.334-21.332-21.334zm-128 53.334c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.358 32-32 32zM490.667 64h-56.811c-9.259-30.741-37.483-53.333-71.189-53.333S300.736 33.259 291.477 64H21.333C9.557 64 0 73.557 0 85.333s9.557 21.333 21.333 21.333h270.144C300.736 137.408 328.96 160 362.667 160s61.931-22.592 71.189-53.333h56.811c11.797 0 21.333-9.557 21.333-21.333S502.464 64 490.667 64zm-128 53.333c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.358 32-32 32zM490.667 234.667H220.523c-9.259-30.741-37.483-53.333-71.189-53.333s-61.931 22.592-71.189 53.333H21.333C9.557 234.667 0 244.224 0 256c0 11.776 9.557 21.333 21.333 21.333h56.811c9.259 30.741 37.483 53.333 71.189 53.333s61.931-22.592 71.189-53.333h270.144c11.797 0 21.333-9.557 21.333-21.333.001-11.776-9.535-21.333-21.332-21.333zM149.333 288c-17.643 0-32-14.357-32-32s14.357-32 32-32 32 14.357 32 32-14.357 32-32 32z" />
  </svg>
);


export default function Header({ user }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleActiveMenu = (e) => {
    e.stopPropagation();

    // Lấy sidebar element
    const sidebar = document.querySelector(".pc-sidebar");

    // Toggle class cho sidebar và body
    if (sidebar) {
      sidebar.classList.toggle("open");
      document.body.classList.toggle("pc-sidebar-collapse");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Xử lý đóng user menu
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }

      // Xử lý đóng search dropdown
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSearch(false);
      }

      // Tự động đóng sidebar trên mobile khi click bên ngoài
      if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector(".pc-sidebar");
        if (
          sidebar &&
          sidebar.classList.contains("open") &&
          !sidebar.contains(event.target)
        ) {
          sidebar.classList.remove("open");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="pc-header">
      <div className="header-wrapper">
        {/* [Mobile Media Block] */}
        <div className="me-auto pc-mob-drp">
          <ul className="list-unstyled">
            <li
              onClick={handleActiveMenu}
              className="pc-h-item pc-sidebar-collapse"
            >
              <span className="pc-head-link ms-0" id="sidebar-hide">
                <i className="ti ti-menu-2"></i>
              </span>
            </li>
            <li
              onClick={handleActiveMenu}
              className="pc-h-item pc-sidebar-popup"
            >
              <span className="pc-head-link ms-0" id="mobile-collapse">
                <i className="ti ti-menu-2"></i>
              </span>
            </li>

            <li className="dropdown pc-h-item" ref={searchRef}>
              <span
                className="pc-head-link arrow-none m-0 trig-drp-search"
                onClick={() => setShowSearch(!showSearch)}
              >
                <i className="ph-duotone ph-magnifying-glass icon-search"></i>
              </span>
              {showSearch && (
                <div className="dropdown-menu drp-search show">
                  <form className="px-3 py-2">
                    <input
                      type="search"
                      className="form-control border-0 shadow-none"
                      placeholder="Search here. . ."
                    />
                  </form>
                </div>
              )}
            </li>
          </ul>
        </div>

        {/* [User Block] */}
        <div className="ms-auto">
          <ul>
            <li className="dropdown pc-h-item d-none d-md-inline-flex" ref={userMenuRef}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <i className="ph-duotone ph-sun-dim"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-moon"></i> <span>Dark</span></button>
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-sun-dim"></i> <span>Light</span></button>
                <button className="dropdown-item" type="button" > <i className="ph-duotone ph-cpu"></i> <span>Default</span></button>
              </div>
            </li>
            <li className="dropdown pc-h-item header-user-profile" ref={searchRef}>
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <i className="ph-duotone ph-bell icon-notification"></i>
                <span className="notification-badge">{user?.notifications?.length || 0}</span>
              </button>
              <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                <div className="dropdown-header d-flex align-items-center justify-content-between">
                  <h5 className="m-0">Thông báo</h5>
                </div>
                <div className="dropdown-body">
                  <div
                    className="notification-scroll position-relative"
                    style={{ maxHeight: "calc(100vh - 225px)" }}
                  >
                    {user?.notifications?.length === 0 && (
                      <div className="dropdown-item text-muted">Không có thông báo mới</div>
                    )}
                    {user?.notifications?.map((n) => (
                      <div key={n._id} className="dropdown-item">
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 ms-3">
                            <h6 className="mb-1">{n.type}</h6>
                            <div>{n.data?.text || JSON.stringify(n.data) || ''}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
            <li
              className="dropdown pc-h-item header-user-profile"
              ref={searchRef}
            >
              <button
                type="button"
                className="pc-head-link dropdown-toggle arrow-none me-0 btn btn-link p-0 border-0"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <i className="ph-duotone ph-chat-circle-dots icon-message"></i>
                <span className="notification-badge">{user?.messages?.length || 0}</span>
              </button>
              <div className="dropdown-menu dropdown-menu-end pc-h-dropdown">
                <div className="dropdown-header d-flex align-items-center justify-content-between">
                  <h5 className="m-0">Tin nhắn</h5>
                </div>
                <div className="dropdown-body">
                  <div
                    className="message-scroll position-relative"
                    style={{ maxHeight: "calc(100vh - 225px)" }}
                  >
                    {user?.messages?.length === 0 && (
                      <div className="dropdown-item text-muted">Không có tin nhắn mới</div>
                    )}
                    {user?.messages?.map((m) => (
                      <div key={m._id} className="dropdown-item">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <img
                              src={`https://ui-avatars.com/api/?background=random&name=${user?.username || "User"}`}
                              alt="user-avatar"
                              className="user-avtar"
                              width={40}
                              height={40}
                            />
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <h6 className="mb-1">
                              {m.participants?.map(p => p.displayName || p.username).join(', ')}
                            </h6>
                            <h6 className="text-primary">
                              <i className="ph-duotone ph-message-circle"></i> {m.messages?.[m.messages.length - 1]?.text || "Tin nhắn mới"}
                            </h6>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
            <li
              className="dropdown pc-h-item header-user-profile"
              ref={userMenuRef}
            >
              <span
                className="pc-head-link dropdown-toggle arrow-none me-0"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <img
                  src={`https://ui-avatars.com/api/?background=random&name=${user?.username || "User"
                    }`}
                  alt="user-avatar"
                  className="user-avtar"
                  width={40}
                  height={40}
                />
              </span>
              {showUserMenu && (
                <div
                  className="dropdown-menu dropdown-user-profile dropdown-menu-end pc-h-dropdown show"
                  data-popper-placement="bottom-end"
                  style={{
                    position: "absolute",
                    inset: "0px 0px auto auto",
                    margin: 0,
                    transform: "translate(0px, 61px)",
                  }}
                >
                  {/* <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <h5 className="m-0">Thông tin</h5>
                  </div> */}
                  <div className="dropdown-body">
                    <div
                      className="profile-notification-scroll position-relative"
                      style={{ maxHeight: "calc(100vh - 225px)" }}
                    >
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                          <img
                            src={`https://ui-avatars.com/api/?background=random&name=${user?.username || "User"
                              }`}
                            alt="user-avatar"
                            className="user-avtar wid-35"
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            {user?.displayName || "Vui Lòng Đăng Nhập"}
                          </h6>
                        </div>
                      </div>

                      <hr className="border-secondary border-opacity-50" />
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">

                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <FilterSettingsIcon
                                width={20}
                                height={20}
                                fill="#5ee491ff"
                              /> Cài đặt tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div>
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link onClick={
                              () => {
                                localStorage.removeItem("token");
                                window.location.reload();
                              }
                            } to="/profile" className="dropdown-item">
                              <ArrowMenuIcon
                                width={20}
                                height={20}
                                fill="#5ee491ff"
                              />
                              Đăng xuất
                            </Link>
                          </h6>
                        </div>
                      </div>
                      {/* <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                              />
                              Đăng xuất
                            </Link>
                          </h6>
                        </div>
                      </div>
                      {/* <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <i className="ti ti-user me-2 text-muted"></i> Thông
                              tin tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div>
                      <div className="d-flex mb-1">
                        <div className="flex-shrink-0">
                        </div>
                        <div>
                          <h6 className="ms-3 mb-0 mt-2" style={{ fontSize: '16px' }}>
                            <Link to="/profile" className="dropdown-item">
                              <i className="ti ti-user me-2 text-muted"></i> Thông
                              tin tài khoản
                            </Link>
                          </h6>
                        </div>
                      </div> */}
                      <hr className="border-secondary border-opacity-50" />

                    </div>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
